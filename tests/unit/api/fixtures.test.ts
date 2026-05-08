import { describe, it, expect } from 'vitest'
import { fixtures } from '@/lib/api/fixtures'
import {
  OrgSchema,
  UserSchema,
  NotificationSchema,
  NetworkHealthSchema,
} from '@/lib/api/schemas'

describe('fixtures', () => {
  it('orgs round-trip through OrgSchema', () => {
    fixtures.orgs.forEach((o) => OrgSchema.parse(o))
    expect(fixtures.orgs.length).toBeGreaterThan(0)
  })

  it('users round-trip through UserSchema', () => {
    fixtures.users.forEach((u) => UserSchema.parse(u))
    // Three demo personas: counterparty, originator, dual-role admin
    expect(fixtures.users.length).toBeGreaterThanOrEqual(3)
  })

  it('every user references an existing org', () => {
    const orgIds = new Set(fixtures.orgs.map((o) => o.id))
    fixtures.users.forEach((u) => {
      expect(orgIds.has(u.orgId)).toBe(true)
    })
  })

  it('notifications round-trip', () => {
    fixtures.notifications.forEach((n) => NotificationSchema.parse(n))
  })

  it('network health round-trips', () => {
    NetworkHealthSchema.parse(fixtures.networkHealth)
  })
})
