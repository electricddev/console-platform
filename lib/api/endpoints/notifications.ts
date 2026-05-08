import { mockEndpoint, mockQuery, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { NotificationSchema } from '@/lib/api/schemas'
import type { Notification } from '@/lib/api/types'

// In-memory state per user. Real backend = real persistence.
const stateByUser = new Map<string, Notification[]>()

function load(userId: string): Notification[] {
  if (!stateByUser.has(userId)) {
    stateByUser.set(userId, fixtures.notifications.map((n) => ({ ...n })))
  }
  return stateByUser.get(userId)!
}

export const listMyNotifications = mockQuery<Notification[]>(
  (ctx: RequestContext) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    return load(ctx.user.id).map((n) => NotificationSchema.parse(n))
  },
  { latencyMs: 80 }
)

export const markNotificationRead = mockEndpoint(
  async (ctx: RequestContext, _signal, notificationId: string) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const list = load(ctx.user.id)
    const target = list.find((n) => n.id === notificationId)
    if (!target) throw new MockApiError('Notification not found', 404)
    target.read = true
    return { ok: true as const }
  },
  { latencyMs: 60 }
)

export const markAllNotificationsRead = mockEndpoint(
  async (ctx: RequestContext) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    load(ctx.user.id).forEach((n) => (n.read = true))
    return { ok: true as const }
  },
  { latencyMs: 60 }
)
