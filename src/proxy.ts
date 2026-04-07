import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Let /auth/callback handle itself — no proxy interference ───────────────
  // Supabase sends invite/magic-link emails directly to /auth/callback?code=xxx
  // (when Site URL is set to https://projetista-ai.vercel.app/auth/callback).
  // The route handler at /auth/callback exchanges the code — don't touch it here.
  if (pathname === '/auth/callback') {
    return NextResponse.next()
  }

  // ── Forward auth codes from any other page ───────────────────────────────
  // If Supabase ever redirects to the root or another page with ?code=xxx,
  // forward immediately to /auth/callback before any Supabase setup runs.
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    return NextResponse.redirect(new URL(`/auth/callback?code=${code}`, request.url))
  }

  let supabaseResponse = NextResponse.next({ request })

  // Skip auth if Supabase is not yet configured
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey || anonKey === 'PASTE_YOUR_ANON_KEY_HERE') {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const termsAccepted = user?.user_metadata?.terms_accepted === true

  // Unauthenticated → block /app/* and /onboard
  if (!user && (pathname.startsWith('/app') || pathname === '/onboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Authenticated but T&C not accepted → block /app/*
  if (user && !termsAccepted && pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/onboard', request.url))
  }

  // Authenticated + T&C accepted → skip /onboard, go to dashboard
  if (user && termsAccepted && pathname === '/onboard') {
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }

  // Authenticated on login page → route correctly
  if (user && pathname === '/login') {
    if (!termsAccepted) {
      return NextResponse.redirect(new URL('/onboard', request.url))
    }
    return NextResponse.redirect(new URL('/app/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
