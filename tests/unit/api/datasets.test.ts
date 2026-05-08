import { describe, it, expect } from 'vitest'
import {
  listDatasets, getDataset, getDatasetSchema, getDatasetRuns,
} from '@/lib/api/endpoints/datasets'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('dataset endpoints', () => {
  it('listDatasets returns visible datasets', async () => {
    const list = await listDatasets(ctx, {})
    expect(list.length).toBeGreaterThan(0)
  })
  it('listDatasets filters by assetClass', async () => {
    const list = await listDatasets(ctx, { assetClass: 't-bills' })
    expect(list.every((d) => d.assetClass === 't-bills')).toBe(true)
  })
  it('listDatasets filters by status', async () => {
    const list = await listDatasets(ctx, { status: 'paused' })
    expect(list.every((d) => d.status === 'paused')).toBe(true)
  })
  it('listDatasets filters by free-text search', async () => {
    const list = await listDatasets(ctx, { search: 'mF-ONE' })
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].name).toBe('mF-ONE')
  })
  it('getDataset returns one dataset', async () => {
    const d = await getDataset(ctx, 'ds_mfone')
    expect(d.id).toBe('ds_mfone')
  })
  it('getDataset throws on unknown id', async () => {
    await expect(getDataset(ctx, 'ds_nope')).rejects.toThrow()
  })
  it('getDatasetSchema returns the dataset schema', async () => {
    const s = await getDatasetSchema(ctx, 'ds_mfone')
    expect(s.fields.length).toBeGreaterThan(0)
  })
  it('getDatasetRuns filters by datasetId', async () => {
    const runs = await getDatasetRuns(ctx, 'ds_mfone')
    expect(runs.every((r) => r.datasetId === 'ds_mfone')).toBe(true)
  })
})
