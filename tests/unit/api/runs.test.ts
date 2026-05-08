import { describe, it, expect } from 'vitest'
import { listRuns, getRun, executeTemplate, retryRun } from '@/lib/api/endpoints/runs'

const ctx = { user: { id: 'usr_maya', orgId: 'org_gauntlet', role: 'counterparty' as const } }

describe('run endpoints', () => {
  it('listRuns returns runs', async () => {
    const list = await listRuns(ctx, {})
    expect(list.length).toBeGreaterThan(0)
  })
  it('listRuns filters by status', async () => {
    const list = await listRuns(ctx, { status: 'completed' })
    expect(list.every((r) => r.status === 'completed')).toBe(true)
  })
  it('getRun returns one run', async () => {
    const r = await getRun(ctx, 'run_4821')
    expect(r.id).toBe('run_4821')
    expect(r.attestation).toBeDefined()
  })
  it('executeTemplate creates a queued run', async () => {
    const r = await executeTemplate(ctx, {
      templateId: 'tpl_advance_rate_by_sector',
      datasetId: 'ds_mfone',
      parameters: { window_start: '2026-01-01', window_end: '2026-04-30', min_bucket: 10 },
    })
    // The run is returned immediately in queued status; progression fires via setTimeout.
    expect(r.status).toMatch(/queued|running|completed/)
    expect(r.runnerId).toBe(ctx.user.id)
  })
  it('retryRun creates a new run from a failed one', async () => {
    const r = await retryRun(ctx, 'run_4820')
    expect(r.id).not.toBe('run_4820')
    expect(r.parameters).toEqual({ window_start: '2025-10-01', window_end: '2025-12-31', min_bucket: 10 })
  })
})
