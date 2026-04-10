import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { performExtraction, isExtractable } from '@/lib/ai/extract-document'

export const maxDuration = 60

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params

    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's org
    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.id)
      .single()
    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'No organization found' }, { status: 403 })
    }

    // 3. Fetch document and verify ownership
    const serviceClient = createServiceClient()
    const { data: doc, error: docError } = await serviceClient
      .from('documents')
      .select('file_path, file_name, application_id, organization_id')
      .eq('id', id)
      .single()

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }
    if (doc.organization_id !== profile.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 4. Determine MIME type from filename
    const ext = doc.file_name?.split('.').pop()?.toLowerCase() ?? ''
    const mimeMap: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    }
    const mimeType = mimeMap[ext] ?? 'application/octet-stream'

    if (!isExtractable(mimeType)) {
      return NextResponse.json({ error: 'File type not supported for extraction' }, { status: 400 })
    }

    // 5. Run extraction synchronously (client waits — gives real error feedback)
    const result = await performExtraction(id, doc.file_path, doc.application_id, mimeType)

    if (!result) {
      // performExtraction already set status='failed' and stored error in extracted_fields
      const { data: ef } = await serviceClient
        .from('extracted_fields')
        .select('fields')
        .eq('document_id', id)
        .maybeSingle()
      return NextResponse.json(
        { error: ef?.fields?.error ?? 'Extraction failed' },
        { status: 422 }
      )
    }

    return NextResponse.json({ result })
  } catch (err: any) {
    console.error('[extract] Error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
