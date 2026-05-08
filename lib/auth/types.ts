import type { Role } from '@/lib/api/types'

export type Density = 'compact' | 'comfortable'

export type SessionData = {
  userId?: string
  orgId?: string
  role?: Role
  density?: Density
}
