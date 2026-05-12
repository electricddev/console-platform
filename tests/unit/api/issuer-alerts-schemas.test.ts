import { describe, it, expect } from 'vitest'
import {
  IssuerRequestSchema, IssuerRequestKindSchema, IssuerRequestStatusSchema,
  IssuerComplianceSchema, AlertChannelSchema, AlertRuleSchema, SlaCadenceSchema,
} from '@/lib/api/schemas'

describe('issuer + alerts schemas', () => {
  it('IssuerRequestKindSchema is closed', () => {
    expect(IssuerRequestKindSchema.options).toEqual(['attestation-request', 'gap-acceptance', 'sla-renegotiation'])
  })

  it('IssuerRequestStatusSchema is closed', () => {
    expect(IssuerRequestStatusSchema.options).toEqual(['pending', 'accepted', 'declined'])
  })

  it('SlaCadenceSchema is closed', () => {
    expect(SlaCadenceSchema.options).toEqual(['daily', 'weekly', 'monthly', 'quarterly'])
  })

  it('IssuerRequestSchema parses with payload record', () => {
    expect(() => IssuerRequestSchema.parse({
      id: 'req_1', issuerId: 'org_apollo', requestedBy: 'u1',
      requestedAt: '2026-05-12T10:00:00.000Z', kind: 'attestation-request',
      payload: { cadence: 'weekly', metric: 'leverage', startDate: '2026-06-01' },
      status: 'pending',
    })).not.toThrow()
  })

  it('IssuerComplianceSchema parses', () => {
    expect(() => IssuerComplianceSchema.parse({
      issuerId: 'org_apollo', assetIds: ['ds_acred'],
      discipline: {
        expectedLast30d: 30, deliveredLast30d: 30, onTimeLast30d: 28, lastGapAt: null,
        cadenceBreakdown: [{ cadence: 'daily', metric: 'NAV', delivered: 30, expected: 30, onTime: 30 }],
      },
      openRequestCount: 0,
    })).not.toThrow()
  })

  it('AlertRuleSchema parses with default enabled=true and empty arrays', () => {
    const parsed = AlertRuleSchema.parse({
      id: 'rule_1', label: 'High leverage anywhere',
      condition: { metric: 'leverage', threshold: 0.75, direction: 'above' },
      scope: { datasetIds: [] },
      channelIds: ['ch_1'],
      createdBy: 'u1', createdAt: '2026-05-12T10:00:00.000Z',
    })
    expect(parsed.enabled).toBe(true)
    expect(parsed.scope.kinds).toEqual([])
    expect(parsed.scope.severities).toEqual([])
  })

  it('AlertChannelSchema enforces channel kind', () => {
    expect(() => AlertChannelSchema.parse({
      id: 'ch_1', kind: 'pigeon', label: 'x', target: 'y',
      createdBy: 'u1', createdAt: '2026-05-12T10:00:00.000Z',
    })).toThrow()
  })
})
