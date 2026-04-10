import Anthropic from '@anthropic-ai/sdk'
import { createServiceClient } from '@/lib/supabase/service'
import { BANK_SLUGS } from '@/lib/credit-programs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

/** MIME types that support Claude Vision extraction */
const EXTRACTABLE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export function isExtractable(mimeType: string): boolean {
  return EXTRACTABLE_TYPES.has(mimeType)
}

export type ExtractionResult = {
  doc_key: string
  confidence: number
  issue_date: string | null
  expiry_date: string | null
  extracted_fields: Record<string, string | null>
  summary: string
}

/**
 * Run Claude Vision extraction on an uploaded document.
 *
 * 1. Download the file from Supabase Storage
 * 2. Send to Claude with the checklist context
 * 3. Calculate effective expiry (explicit or issue_date + validity_days)
 * 4. Write results to documents + extracted_fields tables
 */
export async function performExtraction(
  documentId: string,
  filePath: string,
  applicationId: string,
  mimeType: string
) {
  const supabase = createServiceClient()

  // Mark as processing
  await supabase
    .from('documents')
    .update({ status: 'processing' })
    .eq('id', documentId)

  try {
    // 1. Download file from storage
    const { data: fileData, error: dlError } = await supabase
      .storage
      .from('documents')
      .download(filePath)

    if (dlError || !fileData) {
      throw new Error(`Failed to download file: ${dlError?.message ?? 'no data'}`)
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    const base64 = buffer.toString('base64')

    // 2. Fetch the application's checklist doc_keys for context
    const { data: app } = await supabase
      .from('applications')
      .select('doc_checklist, program_code, bank')
      .eq('id', applicationId)
      .single()

    const checklist: { doc_key: string; label: string; category: string }[] =
      (app?.doc_checklist ?? []).map((item: any) => ({
        doc_key: item.doc_key,
        label: item.label,
        category: item.category,
      }))

    // 3. Build the Claude prompt
    const docListText = checklist
      .map(d => `- ${d.doc_key}: ${d.label} (categoria ${d.category})`)
      .join('\n')

    const promptText = `Você está analisando um documento de crédito rural brasileiro.

Identifique qual tipo de documento é este, comparando com a lista abaixo:

${docListText}

Retorne APENAS um JSON válido (sem markdown, sem backticks) com esta estrutura:
{
  "doc_key": "chave do tipo de documento da lista acima, ou 'unknown' se não conseguir identificar",
  "confidence": 0.95,
  "issue_date": "2025-03-15 ou null se não encontrar data de emissão",
  "expiry_date": "2026-03-15 ou null se não houver data de validade explícita no documento",
  "extracted_fields": {
    "nome": "nome encontrado no documento ou null",
    "cpf_cnpj": "CPF ou CNPJ encontrado ou null",
    "numero_registro": "número de registro/protocolo ou null",
    "orgao_emissor": "órgão emissor ou null",
    "propriedade": "nome da propriedade/imóvel ou null",
    "municipio": "município ou null",
    "uf": "estado ou null",
    "area_ha": "área em hectares ou null",
    "valor": "valor monetário encontrado ou null"
  },
  "summary": "Breve descrição de uma frase sobre o documento"
}`

    // 4. Call Claude Vision API
    const isPdf = mimeType === 'application/pdf'

    const contentBlock: any = isPdf
      ? {
          type: 'document' as const,
          source: {
            type: 'base64' as const,
            media_type: 'application/pdf' as const,
            data: base64,
          },
        }
      : {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
            data: base64,
          },
        }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: promptText },
          ],
        },
      ],
    })

    // 5. Parse Claude's response — robustly extract JSON even if Claude adds surrounding text
    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from Claude')
    }

    let jsonStr = textBlock.text.trim()

    // Strip markdown code fences if present
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    // If Claude added preamble text, extract the first JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(`Claude response contained no JSON object. Raw: ${jsonStr.slice(0, 200)}`)
    }
    jsonStr = jsonMatch[0]

    let result: ExtractionResult
    try {
      result = JSON.parse(jsonStr)
    } catch (parseErr: any) {
      throw new Error(`JSON parse failed: ${parseErr.message}. Raw: ${jsonStr.slice(0, 200)}`)
    }

    // 6. Calculate effective expiry date
    let effectiveExpiry = result.expiry_date

    if (!effectiveExpiry && result.issue_date && result.doc_key !== 'unknown') {
      // Look up validity_days from program_doc_requirements
      // app.bank is the display name (e.g. "Banco do Brasil") — convert to slug
      const bankSlug = app?.bank ? (BANK_SLUGS[app.bank] ?? null) : null
      const { data: program } = await supabase
        .from('credit_programs')
        .select('id')
        .eq('code', app?.program_code ?? '')
        .or(bankSlug ? `bank.is.null,bank.eq.${bankSlug}` : 'bank.is.null')
        .maybeSingle()

      if (program) {
        const { data: req } = await supabase
          .from('program_doc_requirements')
          .select('validity_days')
          .eq('program_id', program.id)
          .eq('doc_key', result.doc_key)
          .or(bankSlug ? `bank.is.null,bank.eq.${bankSlug}` : 'bank.is.null')
          .not('validity_days', 'is', null)
          .order('bank', { nullsFirst: false }) // prefer bank-specific over MCR
          .limit(1)
          .maybeSingle()

        if (req?.validity_days) {
          const issueDate = new Date(result.issue_date)
          issueDate.setDate(issueDate.getDate() + req.validity_days)
          effectiveExpiry = issueDate.toISOString().split('T')[0]
        }
      }
    }

    // 7. Update documents table
    await supabase
      .from('documents')
      .update({
        doc_type: result.doc_key,
        expiry_date: effectiveExpiry,
        status: result.confidence >= 0.5 ? 'completed' : 'completed',
      })
      .eq('id', documentId)

    // 8. Insert extracted_fields
    await supabase
      .from('extracted_fields')
      .upsert({
        document_id: documentId,
        fields: {
          ...result.extracted_fields,
          doc_key: result.doc_key,
          confidence: result.confidence,
          issue_date: result.issue_date,
          expiry_date: result.expiry_date,
          effective_expiry: effectiveExpiry,
          summary: result.summary,
        },
        manually_edited: false,
      }, { onConflict: 'document_id' })

    return result
  } catch (err: any) {
    console.error('[extract-document] Extraction failed:', err)

    // Mark as failed
    await supabase
      .from('documents')
      .update({ status: 'failed' })
      .eq('id', documentId)

    // Store error in extracted_fields for debugging
    await supabase
      .from('extracted_fields')
      .upsert({
        document_id: documentId,
        fields: { error: err.message ?? 'Unknown extraction error' },
        manually_edited: false,
      }, { onConflict: 'document_id' })

    return null
  }
}
