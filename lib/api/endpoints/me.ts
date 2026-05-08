import { mockQuery, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { UserSchema } from '@/lib/api/schemas'
import type { User } from '@/lib/api/types'

export const getCurrentUser = mockQuery<User>((ctx: RequestContext) => {
  if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
  const u = fixtures.users.find((x) => x.id === ctx.user!.id)
  if (!u) throw new MockApiError('User not found', 404)
  return UserSchema.parse(u)
})
