import { NextResponse, type NextRequest } from 'next/server'

// Paths that require an authenticated session. Everything else is public.
// The legacy originator UI lives under /legacy/* and stays gated; the new
// (originator) and (counterparty) surfaces at / and /cp/* are public.
const PRIVATE_PATHS = ['/legacy']
// Auth landing pages that bounce signed-in users back to home.
const AUTH_PATHS = ['/login']

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const requiresAuth = PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Read the iron-session cookie name (must match lib/auth/session.ts).
  const hasSession = req.cookies.has('hyve_session')

  if (requiresAuth && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  const isAuthLanding = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (isAuthLanding && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|parquet)).*)'],
}
