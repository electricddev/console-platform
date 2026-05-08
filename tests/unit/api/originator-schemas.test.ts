import { describe, it, expect } from 'vitest'
import { SourceSchema, ApprovalRequestSchema, AccessGrantSchema } from '@/lib/api/schemas'

describe('originator schemas', () => {
  it('Source rejects out-of-range completeness', () => {
    expect(() => SourceSchema.parse({
      id: 's1', name: 'x', type: 'postgres', ownerOrgId: 'org_x',
      recordsProcessed: 0, lastCommitAt: new Date().toISOString(),
      lagSeconds: 0, completenessPct: 1.5, status: 'healthy',
      agentVersion: '1.0.0', agentInstalledAt: new Date().toISOString(),
    })).toThrow()
  })
  it('ApprovalRequest defaults urgency to normal', () => {
    const a = ApprovalRequestSchema.parse({
      id: 'a1', templateId: 't1', templateVersionId: 't1_v1', datasetId: 'd1',
      requesterId: 'u1', requesterOrgId: 'o1', requestedAt: new Date().toISOString(),
      state: 'pending',
    })
    expect(a.urgency).toBe('normal')
  })
  it('AccessGrant defaults templateIds to empty', () => {
    const g = AccessGrantSchema.parse({
      id: 'g1', counterpartyOrgId: 'o1', datasetId: 'd1', level: 'execute',
      rateLimitPerDay: 100, grantedAt: new Date().toISOString(), grantedBy: 'u1',
    })
    expect(g.allowedTemplateIds).toEqual([])
  })
})
