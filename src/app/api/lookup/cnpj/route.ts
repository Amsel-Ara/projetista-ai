import { NextRequest, NextResponse } from 'next/server'

/**
 * CNPJ lookup — uses BrasilAPI (confirmed working, free, no auth).
 * Cached 24 hours — company registration data changes infrequently.
 *
 * Called from frontend: GET /api/lookup/cnpj?cnpj=00000000000000
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('cnpj') ?? ''
  const cnpj = raw.replace(/\D/g, '')

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos.' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      next: { revalidate: 86400 }, // 24-hour server-side cache
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: data.message ?? `CNPJ não encontrado (${res.status}).` },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      razao_social:      data.razao_social            ?? null, // "EMPRESA LTDA"
      nome_fantasia:     data.nome_fantasia            ?? null,
      cnae:              data.cnae_fiscal              ?? null, // 6201500
      cnae_descricao:    data.cnae_fiscal_descricao    ?? null,
      natureza_juridica: data.natureza_juridica        ?? null, // "206-2 - Sociedade Empresária Limitada"
      situacao:          data.descricao_situacao_cadastral ?? null, // "ATIVA"
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro de rede: ${err.message}` }, { status: 500 })
  }
}
