import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { SourceSchema, IngestionEventSchema } from '@/lib/api/schemas'
import type { Source, IngestionEvent } from '@/lib/api/types'

const state: Source[] = fixtures.sources.map((s) => ({ ...s }))

export const listSources = mockEndpoint(
  async (ctx: RequestContext): Promise<Source[]> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    return state.filter((s) => s.ownerOrgId === ctx.user!.orgId).map((s) => SourceSchema.parse(s))
  },
  { latencyMs: 160 }
)

export const getSource = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string): Promise<Source> => {
    const s = state.find((x) => x.id === sourceId)
    if (!s) throw new MockApiError('Source not found', 404)
    return SourceSchema.parse(s)
  },
  { latencyMs: 100 }
)

export const pauseSource = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string) => {
    const s = state.find((x) => x.id === sourceId)
    if (!s) throw new MockApiError('Source not found', 404)
    s.status = 'paused'
    return { ok: true as const }
  },
  { latencyMs: 80 }
)

export const resumeSource = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string) => {
    const s = state.find((x) => x.id === sourceId)
    if (!s) throw new MockApiError('Source not found', 404)
    s.status = 'healthy'
    return { ok: true as const }
  },
  { latencyMs: 80 }
)

export const getSourceEvents = mockEndpoint(
  async (_ctx: RequestContext, _signal, sourceId: string): Promise<IngestionEvent[]> => {
    return fixtures.ingestionEvents
      .filter((e) => e.sourceId === sourceId)
      .map((e) => IngestionEventSchema.parse(e))
  },
  { latencyMs: 120 }
)

export const connectSource = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { name: string; type: Source['type'] }): Promise<Source> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'src_' + Math.random().toString(36).slice(2, 8)
    const s: Source = {
      id,
      name: input.name,
      type: input.type,
      ownerOrgId: ctx.user.orgId,
      recordsProcessed: 0,
      lastCommitAt: new Date().toISOString(),
      lagSeconds: 0,
      completenessPct: 1,
      status: 'healthy',
      agentVersion: '1.4.2',
      agentInstalledAt: new Date().toISOString(),
    }
    state.unshift(s)
    return SourceSchema.parse(s)
  },
  { latencyMs: 300 }
)
