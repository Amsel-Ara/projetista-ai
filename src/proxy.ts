import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
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
  const { pathname } = request.nextUrl

  // Forward Supabase auth codes from any page (e.g. landing page) to the callback handler
  const code = request.nextUrl.searchParams.get('code')
  if (code && pathname !== '/auth/callback') {
    return NextResponse.redirect(new URL(`/auth/callback?code=${code}`, request.url))
  }
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
  matcher: ['/', '/app/:path*', '/login', '/onboard'],
}
