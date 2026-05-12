// tests/unit/api/issuers-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import { listIssuers, getIssuer, listIssuerRequests, submitIssuerRequest } from '@/lib/api/endpoints/issuers'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }
beforeEach(() => store.__resetForTests())

describe('issuers endpoints', () => {
  it('listIssuers includes Apollo and the three mocked peers', async () => {
    const issuers = await listIssuers(ctx)
    const ids = issuers.map((i) => i.issuerId)
    expect(ids).toEqual(expect.arrayContaining(['org_apollo', 'org_janus', 'org_fasanara_mgr', 'org_amsmgr']))
  })

  it('getIssuer returns one IssuerCompliance with attestation discipline', async () => {
    const apollo = await getIssuer(ctx, 'org_apollo')
    expect(apollo.issuerId).toBe('org_apollo')
    expect(apollo.discipline.expectedLast30d).toBeGreaterThan(0)
    expect(apollo.assetIds).toContain('ds_acred')
  })

  it('submitIssuerRequest appends to the request log', async () => {
    const req = await submitIssuerRequest(ctx, {
      issuerId: 'org_apollo', kind: 'attestation-request',
      payload: { cadence: 'weekly', metric: 'leverage' },
    })
    expect(req.id).toMatch(/^req_/)
    expect(req.status).toBe('pending')
    const log = await listIssuerRequests(ctx, 'org_apollo')
    expect(log).toHaveLength(1)
  })

  it('listIssuerRequests filters by issuerId', async () => {
    await submitIssuerRequest(ctx, { issuerId: 'org_apollo', kind: 'attestation-request', payload: {} })
    await submitIssuerRequest(ctx, { issuerId: 'org_janus',  kind: 'attestation-request', payload: {} })
    expect(await listIssuerRequests(ctx, 'org_apollo')).toHaveLength(1)
    expect(await listIssuerRequests(ctx)).toHaveLength(2)
  })
})
