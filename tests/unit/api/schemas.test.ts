import { describe, it, expect } from 'vitest'
import {
  RoleSchema,
  AssetClassSchema,
  OrgSchema,
  UserSchema,
  AttestationSchema,
  NotificationSchema,
} from '@/lib/api/schemas'

describe('core schemas', () => {
  it('Role accepts the three values', () => {
    expect(() => RoleSchema.parse('counterparty')).not.toThrow()
    expect(() => RoleSchema.parse('originator')).not.toThrow()
    expect(() => RoleSchema.parse('admin')).not.toThrow()
    expect(() => RoleSchema.parse('hacker')).toThrow()
  })

  it('AssetClass rejects unknown values', () => {
    expect(() => AssetClassSchema.parse('private-credit')).not.toThrow()
    expect(() => AssetClassSchema.parse('vibes')).toThrow()
  })

  it('Org parses a complete record', () => {
    const org = OrgSchema.parse({
      id: 'org_demo',
      name: 'Gauntlet',
      assetClasses: ['private-credit'],
      verified: true,
    })
    expect(org.name).toBe('Gauntlet')
  })

  it('User parses with nested org', () => {
    const user = UserSchema.parse({
      id: 'usr_demo',
      name: 'Demo',
      email: 'demo@hyve.xyz',
      role: 'counterparty',
      orgId: 'org_demo',
      signingKey: '0xabc',
      lastLoginAt: new Date().toISOString(),
    })
    expect(user.role).toBe('counterparty')
  })

  it('Attestation requires the three core hashes', () => {
    expect(() =>
      AttestationSchema.parse({
        teeMeasurement: '0x' + 'ab'.repeat(32),
        codeHash: '0x' + 'cd'.repeat(32),
        outputSignature: '0x' + 'ef'.repeat(32),
      })
    ).not.toThrow()
  })

  it('Notification requires severity', () => {
    expect(() =>
      NotificationSchema.parse({
        id: 'n1',
        createdAt: new Date().toISOString(),
        read: false,
        kind: 'attestation-published',
        title: 'New attestation',
        body: '…',
        severity: 'info',
      })
    ).not.toThrow()
  })
})
