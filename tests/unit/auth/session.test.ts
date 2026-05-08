import { describe, it, expect } from 'vitest'
import { sessionDataSchema } from '@/lib/auth/schemas'

describe('sessionDataSchema', () => {
  it('accepts an authenticated session', () => {
    const s = sessionDataSchema.parse({
      userId: 'usr_maya',
      orgId: 'org_gauntlet',
      role: 'counterparty',
      density: 'compact',
    })
    expect(s.userId).toBe('usr_maya')
  })

  it('accepts an empty (unauthenticated) session', () => {
    expect(() => sessionDataSchema.parse({})).not.toThrow()
  })

  it('rejects an unknown role', () => {
    expect(() =>
      sessionDataSchema.parse({
        userId: 'usr_x',
        orgId: 'org_x',
        role: 'overlord',
      })
    ).toThrow()
  })
})
