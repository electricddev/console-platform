'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { fixtures, DEMO_PERSONA_IDS } from '@/lib/api/fixtures'
import type { Role } from '@/lib/api/types'

type DemoPersona = keyof typeof DEMO_PERSONA_IDS

export async function signInAs(persona: DemoPersona) {
  const userId = DEMO_PERSONA_IDS[persona]
  const user = fixtures.users.find((u) => u.id === userId)
  if (!user) throw new Error(`Unknown demo persona: ${persona}`)

  const session = await getSession()
  session.userId = user.id
  session.orgId = user.orgId
  session.role = user.role as Role
  session.density = session.density ?? 'compact'
  await session.save()

  redirect('/')
}

export async function signOut() {
  const session = await getSession()
  session.destroy()
  redirect('/login')
}
