'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { fixtures, DEMO_PERSONA_IDS } from '@/lib/api/fixtures'

type DemoPersona = keyof typeof DEMO_PERSONA_IDS

/** Validate a redirect target — only allow same-origin paths. */
function safeNext(next: string | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/'
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

  redirect(safeNext(next))
}

export async function signOut() {
  const session = await getSession()
  await session.destroy()
  redirect('/login')
}
