'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { fixtures, DEMO_PERSONA_IDS } from '@/lib/api/fixtures'
import type { Role } from '@/lib/api/schemas'

type DemoPersona = keyof typeof DEMO_PERSONA_IDS

/** Return the default home path for a given role. */
function personaHome(role: Role): string {
  return role === 'counterparty' ? '/cp' : '/'
}

/**
 * Validate a redirect target — only allow same-origin paths.
 * Returns `undefined` (not a fallback path) when `next` is absent or unsafe,
 * so callers can choose a role-aware default instead.
 */
function safeNext(next: string | undefined): string | undefined {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return undefined
  return next
}

export async function signInAs(persona: DemoPersona, next?: string) {
  const userId = DEMO_PERSONA_IDS[persona]
  const user = fixtures.users.find((u) => u.id === userId)
  if (!user) throw new Error(`Unknown demo persona: ${persona}`)

  const session = await getSession()
  session.userId = user.id
  session.orgId = user.orgId
  session.role = user.role
  session.density = session.density ?? 'compact'
  await session.save()

  redirect(safeNext(next) ?? personaHome(user.role))
}

export async function signOut() {
  const session = await getSession()
  await session.destroy()
  redirect('/login')
}
