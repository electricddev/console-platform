import { describe, it, expect } from 'vitest'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api/endpoints/notifications'
import { DEMO_PERSONA_IDS } from '@/lib/api/fixtures'

const ctx = (userId: string) => ({
  user: { id: userId, orgId: 'org_gauntlet', role: 'counterparty' as const },
})

describe('endpoints', () => {
  it('getCurrentUser returns a user matching the session id', async () => {
    const user = await getCurrentUser(ctx(DEMO_PERSONA_IDS.counterparty))
    expect(user.id).toBe(DEMO_PERSONA_IDS.counterparty)
  })

  it('listMyNotifications returns at least one notification', async () => {
    const list = await listMyNotifications(ctx(DEMO_PERSONA_IDS.counterparty))
    expect(list.length).toBeGreaterThan(0)
  })

  it('markNotificationRead flips read state', async () => {
    const before = await listMyNotifications(ctx(DEMO_PERSONA_IDS.counterparty))
    const target = before.find((n) => !n.read)
    if (!target) throw new Error('no unread fixture')
    await markNotificationRead(ctx(DEMO_PERSONA_IDS.counterparty), target.id)
    const after = await listMyNotifications(ctx(DEMO_PERSONA_IDS.counterparty))
    expect(after.find((n) => n.id === target.id)?.read).toBe(true)
  })

  it('markAllNotificationsRead marks every notification read', async () => {
    await markAllNotificationsRead(ctx(DEMO_PERSONA_IDS.counterparty))
    const after = await listMyNotifications(ctx(DEMO_PERSONA_IDS.counterparty))
    expect(after.every((n) => n.read)).toBe(true)
  })
})
