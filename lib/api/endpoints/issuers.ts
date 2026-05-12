// lib/api/endpoints/issuers.ts
import { z } from 'zod'
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import {
  IssuerComplianceSchema, IssuerRequestSchema, IssuerRequestKindSchema,
  type IssuerCompliance, type IssuerRequest, type IssuerRequestKind,
} from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'
import { fixtures } from '@/lib/api/fixtures'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'

/**
 * Maps known issuer orgs to their IssuerCompliance shape. Apollo uses ACRED's real
 * attestation discipline (from slice 1). Peer issuers use mocked plausible shapes.
 */
function buildCompliance(issuerId: string): IssuerCompliance | null {
  const assetIds = fixtures.datasets
    .filter((d) => d.originatorOrgId === issuerId)
    .map((d) => d.id)
  if (assetIds.length === 0) return null

  const baseDiscipline = (() => {
    if (issuerId === 'org_apollo') return acredAttestationDiscipline
    // Mocked variants for peers — illustrative.
    return {
      expectedLast30d: 30,
      deliveredLast30d: 28,
      onTimeLast30d: 25,
      lastGapAt: new Date(Date.now() - 4 * 86_400_000).toISOString(),
      cadenceBreakdown: [
        { cadence: 'daily' as const,    metric: 'NAV',                 delivered: 28, expected: 30, onTime: 25 },
        { cadence: 'weekly' as const,   metric: 'Leverage',            delivered:  4, expected:  4, onTime:  3 },
        { cadence: 'monthly' as const,  metric: 'Composition',         delivered:  1, expected:  1, onTime:  1 },
        { cadence: 'quarterly' as const, metric: 'SEC N-PORT recon',   delivered:  1, expected:  1, onTime:  1 },
      ],
    }
  })()

  const openRequestCount = store.getIssuerRequests()
    .filter((r) => r.issuerId === issuerId && r.status === 'pending').length

  return { issuerId, assetIds, discipline: baseDiscipline, openRequestCount }
}

export const listIssuers = mockEndpoint(
  async (_ctx: RequestContext): Promise<IssuerCompliance[]> => {
    const seen = new Set<string>()
    const out: IssuerCompliance[] = []
    for (const dataset of fixtures.datasets) {
      if (seen.has(dataset.originatorOrgId)) continue
      seen.add(dataset.originatorOrgId)
      const compliance = buildCompliance(dataset.originatorOrgId)
      if (compliance) out.push(compliance)
    }
    return z.array(IssuerComplianceSchema).parse(out)
  },
  { latencyMs: 140 }
)

export const getIssuer = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, issuerId: string): Promise<IssuerCompliance> => {
    const compliance = buildCompliance(issuerId)
    if (!compliance) throw new MockApiError(`Issuer ${issuerId} not found`, 404)
    return IssuerComplianceSchema.parse(compliance)
  },
  { latencyMs: 120 }
)

export const listIssuerRequests = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, issuerId?: string): Promise<IssuerRequest[]> => {
    const all = store.getIssuerRequests()
    const scoped = issuerId ? all.filter((r) => r.issuerId === issuerId) : all
    return z.array(IssuerRequestSchema).parse(scoped)
  },
  { latencyMs: 100 }
)

export const submitIssuerRequest = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: { issuerId: string; kind: IssuerRequestKind; payload: Record<string, unknown> }): Promise<IssuerRequest> => {
    IssuerRequestKindSchema.parse(payload.kind)
    const req: IssuerRequest = {
      id: `req_${payload.issuerId}_${Date.now()}`,
      issuerId: payload.issuerId,
      requestedBy: ctx.user?.id ?? 'anonymous',
      requestedAt: new Date().toISOString(),
      kind: payload.kind,
      payload: payload.payload,
      status: 'pending',
    }
    store.appendIssuerRequest(req)
    return IssuerRequestSchema.parse(req)
  },
  { latencyMs: 140 }
)
