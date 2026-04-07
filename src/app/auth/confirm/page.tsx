'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Handles both PKCE (?code=) and implicit (?access_token=&refresh_token=) flows.
// Uses the @supabase/ssr browser client which stores the session in cookies so
// the proxy can read it on subsequent requests.
export default function AuthConfirm() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    async function handle() {
      const supabase     = createClient()
      const code         = searchParams.get('code')
      const accessToken  = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')

      let user: { user_metadata?: { terms_accepted?: boolean } } | null = null

      if (code) {
        // PKCE flow — invite codes work without a code_verifier
        const { data } = await supabase.auth.exchangeCodeForSession(code)
        user = data?.user ?? null
      } else if (accessToken && refreshToken) {
        // Implicit flow — set session directly from tokens
        const { data } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
        user = data?.user ?? null
      }

      if (user) {
        const accepted = user.user_metadata?.terms_accepted === true
        router.replace(accepted ? '/app/dashboard' : '/onboard')
      } else {
        router.replace('/login?error=auth')
      }
    }

    handle()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div style={{
      margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'sans-serif', background: '#FAFAFA',
    }}>
      <p style={{ color: '#878C91', fontSize: '15px' }}>Autenticando…</p>
    </div>
  )
}
