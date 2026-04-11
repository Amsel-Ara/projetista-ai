import { NextRequest, NextResponse } from 'next/server'

/**
 * CPF lookup — proxies BrasilAPI which wraps Receita Federal.
 *
 * NOTE: BrasilAPI's /cpf endpoint requires Serpro credentials on their
 * side and is currently returning 404. If this endpoint fails, upgrade to
 * Serpro DataValid (paid, ~R$0.10/query) or BigDataCorp.
 *
 * Called from frontend: GET /api/lookup/cpf?cpf=12345678900
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('cpf') ?? ''
  const cpf = raw.replace(/\D/g, '')

  if (cpf.length !== 11) {
    return NextResponse.json({ error: 'CPF deve ter 11 dígitos.' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cpf/v1/${cpf}`, {
      headers: { Accept: 'application/json' },
      // No cache — always fresh from Receita Federal
      cache: 'no-store',
    })

    if (!res.ok) {
      const body = await res.text()
      // BrasilAPI returns HTML 404 when the endpoint is unavailable
      if (res.status === 404 && body.includes('<html')) {
        return NextResponse.json(
          { error: 'Consulta de CPF indisponível. O serviço externo está fora do ar. Verifique o CPF manualmente na Receita Federal.' },
          { status: 503 }
        )
      }
      return NextResponse.json(
        { error: `CPF não encontrado (${res.status}).` },
        { status: res.status }
      )
    }

    const data = await res.json()

    return NextResponse.json({
      nome:       data.nome       ?? null,  // "MARIA DA SILVA"
      nascimento: data.nascimento ?? null,  // "01/01/1980"
      situacao:   data.situacao?.descricao ?? null, // "Regular"
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro de rede: ${err.message}` }, { status: 500 })
  }
}
