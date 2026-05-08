import type { Role } from '@/lib/api/types'

export type SessionData = {
  userId?: string
  orgId?: string
  role?: Role
  /** UI density preference; persisted alongside session. */
  density?: 'compact' | 'comfortable'
}
