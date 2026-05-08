import { mockEndpoint, mockQuery, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { SchemaSchema } from '@/lib/api/schemas'
import type { Schema } from '@/lib/api/types'

const state: Schema[] = fixtures.schemas.map((s) => ({
  ...s,
  fields: s.fields.map((f) => ({ ...f })),
}))

export const listSchemas = mockQuery<Schema[]>(
  () => state.map((s) => SchemaSchema.parse(s)),
  { latencyMs: 160 }
)

export const getSchema = mockEndpoint(
  async (_ctx: RequestContext, _signal, schemaId: string): Promise<Schema> => {
    const s = state.find((x) => x.id === schemaId)
    if (!s) throw new MockApiError('Schema not found', 404)
    return SchemaSchema.parse(s)
  },
  { latencyMs: 100 }
)

export const saveSchemaDraft = mockEndpoint(
  async (_ctx: RequestContext, _signal, draft: Schema): Promise<Schema> => {
    const baseId = draft.id.replace(/_draft_[a-z0-9]+$/, '').replace(/_v\d+$/, '')
    const id = baseId + '_draft_' + Math.random().toString(36).slice(2, 6)
    const next: Schema = {
      ...draft,
      id,
      version: draft.version + 1,
      publishedAt: new Date().toISOString(),
      signedAt: new Date().toISOString(),
    }
    state.unshift(next)
    return SchemaSchema.parse(next)
  },
  { latencyMs: 220 }
)

export const publishSchema = mockEndpoint(
  async (ctx: RequestContext, _signal, schemaId: string): Promise<Schema> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const s = state.find((x) => x.id === schemaId)
    if (!s) throw new MockApiError('Schema not found', 404)
    s.signedBy = ctx.user.id
    s.signedAt = new Date().toISOString()
    s.publishedAt = new Date().toISOString()
    return SchemaSchema.parse(s)
  },
  { latencyMs: 280 }
)

export const listSchemaVersions = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Schema[]> => {
    return state
      .filter((s) => s.datasetId === datasetId)
      .sort((a, b) => b.version - a.version)
      .map((s) => SchemaSchema.parse(s))
  },
  { latencyMs: 140 }
)
