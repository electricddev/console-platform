import 'server-only'
import { redirect } from 'next/navigation'
import { getSession } from './session'
import type { Role } from '@/lib/api/types'

export async function getOptionalUser() {
  const session = await getSession()
  if (!session.userId || !session.orgId || !session.role) return null
  return {
    id: session.userId,
    orgId: session.orgId,
    role: session.role,
    density: session.density ?? 'compact',
  }
}

export async function requireUser() {
  const user = await getOptionalUser()
  if (!user) redirect('/login')
  return user!
}

export async function requireRole(role: Role | Role[]) {
  const user = await requireUser()
  const allowed = Array.isArray(role) ? role : [role]
  if (!allowed.includes(user.role) && user.role !== 'admin') {
    // 403 surface — handled by app/error boundary or a custom forbidden page.
    throw new Error(`Forbidden: requires role ${allowed.join(' or ')}`)
  }
  return user
}
