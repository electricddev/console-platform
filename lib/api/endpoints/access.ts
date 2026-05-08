import { mockEndpoint, mockQuery, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { AccessGrantSchema } from '@/lib/api/schemas'
import type { AccessGrant, PermissionLevel } from '@/lib/api/types'

const state: AccessGrant[] = fixtures.accessGrants.map((g) => ({ ...g }))

export const listGrants = mockQuery<AccessGrant[]>(
  (ctx) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    // Real backend will enforce this at the DB layer; here we mirror the
    // intended scope so the access matrix only ever shows grants the
    // originator should be able to see.
    const myDatasetIds = new Set(
      fixtures.datasets
        .filter((d) => d.originatorOrgId === ctx.user!.orgId)
        .map((d) => d.id)
    )
    return state.filter((g) => myDatasetIds.has(g.datasetId)).map((g) => AccessGrantSchema.parse(g))
  },
  { latencyMs: 140 }
)

export type GrantInput = {
  counterpartyOrgId: string
  datasetId: string
  level: PermissionLevel
  rateLimitPerDay: number
  allowedTemplateIds: string[]
  expiresAt?: string
}

export const grantAccess = mockEndpoint(
  async (ctx: RequestContext, _signal, input: GrantInput): Promise<AccessGrant> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'agr_' + Math.random().toString(36).slice(2, 8)
    const grant: AccessGrant = {
      id,
      counterpartyOrgId: input.counterpartyOrgId,
      datasetId: input.datasetId,
      level: input.level,
      rateLimitPerDay: input.rateLimitPerDay,
      allowedTemplateIds: input.allowedTemplateIds,
      expiresAt: input.expiresAt,
      grantedAt: new Date().toISOString(),
      grantedBy: ctx.user.id,
    }
    state.unshift(grant)
    return AccessGrantSchema.parse(grant)
  },
  { latencyMs: 220 }
)

export const revokeAccess = mockEndpoint(
  async (_ctx: RequestContext, _signal, grantId: string) => {
    const g = state.find((x) => x.id === grantId)
    if (!g) throw new MockApiError('Grant not found', 404)
    g.level = 'none'
    return { ok: true as const }
  },
  { latencyMs: 200 }
)
