import { describe, it, expect } from 'vitest'
import {
  listTemplates, getTemplate, draftTemplate, archiveTemplate, forkTemplate,
} from '@/lib/api/endpoints/templates'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('template endpoints', () => {
  it('listTemplates returns templates', async () => {
    const t = await listTemplates(ctx, {})
    expect(t.length).toBeGreaterThan(0)
  })
  it('listTemplates filters by datasetId', async () => {
    const t = await listTemplates(ctx, { datasetId: 'ds_mfone' })
    expect(t.every((x) => x.approvals.some((a) => a.datasetId === 'ds_mfone'))).toBe(true)
  })
  it('getTemplate by id', async () => {
    const t = await getTemplate(ctx, 'tpl_advance_rate_by_sector')
    expect(t.versionNumber).toBeGreaterThanOrEqual(1)
  })
  it('draftTemplate inserts a new in-memory template', async () => {
    const t = await draftTemplate(ctx, {
      name: 'Test draft',
      description: 'd',
      dsl: 'SELECT 1',
      parameters: [],
      outputSchema: { shape: 'scalar' },
    })
    expect(t.id).toMatch(/^tpl_/)
    const fetched = await getTemplate(ctx, t.id)
    expect(fetched.name).toBe('Test draft')
  })
  it('archiveTemplate flips archived flag', async () => {
    const t = await draftTemplate(ctx, { name: 'X', description: '', dsl: '', parameters: [], outputSchema: { shape: 'scalar' } })
    await archiveTemplate(ctx, t.id)
    const after = await getTemplate(ctx, t.id)
    expect(after.archived).toBe(true)
  })
  it('forkTemplate creates a copy with attribution', async () => {
    const f = await forkTemplate(ctx, 'tpl_advance_rate_by_sector')
    expect(f.forkOfTemplateId).toBe('tpl_advance_rate_by_sector')
    expect(f.id).not.toBe('tpl_advance_rate_by_sector')
  })
})
