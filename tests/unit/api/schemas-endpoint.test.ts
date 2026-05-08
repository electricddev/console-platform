import { describe, it, expect } from 'vitest'
import { listSchemas, getSchema, saveSchemaDraft, publishSchema } from '@/lib/api/endpoints/schemas-endpoint'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('schema endpoints', () => {
  it('listSchemas returns schemas', async () => {
    const list = await listSchemas(ctx)
    expect(list.length).toBeGreaterThan(0)
  })
  it('getSchema returns one schema', async () => {
    const s = await getSchema(ctx, 'sch_mfone_v3')
    expect(s.fields.length).toBeGreaterThan(0)
  })
  it('saveSchemaDraft + publish increments version', async () => {
    const s = await getSchema(ctx, 'sch_mfone_v3')
    const draft = await saveSchemaDraft(ctx, { ...s, fields: [...s.fields] })
    const published = await publishSchema(ctx, draft.id)
    expect(published.version).toBeGreaterThan(s.version)
  })
})
