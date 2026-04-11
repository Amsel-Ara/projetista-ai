import { NextRequest, NextResponse } from 'next/server'

/**
 * CEP lookup — uses ViaCEP (viacep.com.br).
 * Free, no auth, returns IBGE code + full address.
 * Cached 1 hour — addresses rarely change.
 *
 * Called from frontend: GET /api/lookup/cep?cep=01310100
 */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('cep') ?? ''
  const cep = raw.replace(/\D/g, '')

  if (cep.length !== 8) {
    return NextResponse.json({ error: 'CEP deve ter 8 dígitos.' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 3600 }, // 1-hour server-side cache
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 })
    }

    const data = await res.json()

    // ViaCEP returns { "erro": "true" } for non-existent CEPs
    if (data.erro) {
      return NextResponse.json({ error: 'CEP não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      logradouro: data.logradouro  ?? null,  // "Avenida Paulista"
      bairro:     data.bairro      ?? null,  // "Bela Vista"
      cidade:     data.localidade  ?? null,  // "São Paulo"
      uf:         data.uf          ?? null,  // "SP"
      ibge:       data.ibge        ?? null,  // "3550308"
    })
  } catch (err: any) {
    return NextResponse.json({ error: `Erro de rede: ${err.message}` }, { status: 500 })
  }
}
