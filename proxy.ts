import { NextResponse, type NextRequest } from 'next/server'
import { unsealData } from 'iron-session'
import { sessionDataSchema } from '@/lib/auth/schemas'
import type { Role } from '@/lib/api/schemas'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_COOKIE = 'hyve_session'
const SESSION_PASSWORD =
  process.env.SESSION_PASSWORD ?? 'dev-only-change-me-this-must-be-32-chars-min'

// Paths that require an authenticated session. Everything else is public.
// The legacy originator UI lives under /legacy/* and stays gated; the new
// (originator) and (counterparty) surfaces at / and /cp/* are public.
const PRIVATE_PATHS = ['/legacy']

// Auth landing pages that bounce signed-in users back home (role-aware).
const AUTH_PATHS = ['/login']

// Paths (and path prefixes) that counterparty-role users are allowed to visit.
const COUNTERPARTY_ALLOWED_PREFIXES = ['/cp', '/login', '/logout', '/onboarding']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the persona home for a given role. */
function personaHome(role: Role): string {
  return role === 'counterparty' ? '/cp' : '/'
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * Attempt to decrypt the iron-session cookie and return the role it contains.
 * Returns `null` on any failure (missing cookie, bad seal, schema mismatch) so
 * that callers can treat the request as anonymous.
 */
async function getSessionRole(req: NextRequest): Promise<Role | null> {
  const cookie = req.cookies.get(SESSION_COOKIE)
  if (!cookie?.value) return null

  try {
    const raw = await unsealData<unknown>(cookie.value, { password: SESSION_PASSWORD })
    const parsed = sessionDataSchema.safeParse(raw)
    return parsed.success ? (parsed.data.role ?? null) : null
  } catch {
    // Malformed seal, wrong password, etc. — treat as anonymous.
    return null
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Best-effort session decryption. Falls back to null (anonymous) on any error.
  const role = await getSessionRole(req)
  const hasSession = role !== null

  // ------------------------------------------------------------------
  // 1. /legacy/* — requires any authenticated session.
  //    Counterparty role is not allowed; they redirect to /cp.
  //    Unauthenticated users are redirected to /login?next=…
  // ------------------------------------------------------------------
  const requiresAuth = startsWithAny(pathname, PRIVATE_PATHS)

  if (requiresAuth) {
    if (!hasSession) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
    if (role === 'counterparty') {
      const url = req.nextUrl.clone()
      url.pathname = '/cp'
      url.searchParams.delete('next')
      return NextResponse.redirect(url)
    }
  }

  // ------------------------------------------------------------------
  // 2. Persona surface enforcement for authenticated users.
  //    Only runs when there IS a valid session.
  // ------------------------------------------------------------------
  if (hasSession) {
    if (role === 'counterparty') {
      // Counterparty visiting an originator path → redirect to /cp
      const allowed = startsWithAny(pathname, COUNTERPARTY_ALLOWED_PREFIXES)
      if (!allowed) {
        const url = req.nextUrl.clone()
        url.pathname = '/cp'
        return NextResponse.redirect(url)
      }
    } else {
      // Originator / admin visiting a counterparty path → redirect to /
      if (pathname === '/cp' || pathname.startsWith('/cp/')) {
        const url = req.nextUrl.clone()
        url.pathname = '/'
        return NextResponse.redirect(url)
      }
    }
  }

  // ------------------------------------------------------------------
  // 3. Auth-landing bounce — signed-in users don't need /login.
  //    Destination is role-aware.
  // ------------------------------------------------------------------
  const isAuthLanding = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  if (isAuthLanding && hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = personaHome(role)
    url.searchParams.delete('next')
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Match all routes except Next internals and static assets.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|parquet)).*)'],
}
