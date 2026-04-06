import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      const termsAccepted = data.user.user_metadata?.terms_accepted === true
      if (!termsAccepted) {
        return NextResponse.redirect(`${origin}/onboard`)
      }
      return NextResponse.redirect(`${origin}/app/dashboard`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
