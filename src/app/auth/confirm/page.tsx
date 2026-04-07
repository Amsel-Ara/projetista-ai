'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ConfirmInner() {
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
        const { data } = await supabase.auth.exchangeCodeForSession(code)
        user = data?.user ?? null
      } else if (accessToken && refreshToken) {
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

  return null
}

export default function AuthConfirm() {
  return (
    <div style={{
      margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      height: '100vh', fontFamily: 'sans-serif', background: '#FAFAFA',
    }}>
      <p style={{ color: '#878C91', fontSize: '15px' }}>Autenticando…</p>
      <Suspense fallback={null}>
        <ConfirmInner />
      </Suspense>
    </div>
  )
}
