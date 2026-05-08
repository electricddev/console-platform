import { describe, it, expect } from 'vitest'
import { listSources, getSource, pauseSource, resumeSource, getSourceEvents } from '@/lib/api/endpoints/sources'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('source endpoints', () => {
  it('listSources returns only orgs sources', async () => {
    const list = await listSources(ctx)
    expect(list.every((s) => s.ownerOrgId === 'org_tradefin')).toBe(true)
  })
  it('getSource by id', async () => {
    const s = await getSource(ctx, 'src_mfone_pg')
    expect(s.id).toBe('src_mfone_pg')
  })
  it('pauseSource flips status', async () => {
    await pauseSource(ctx, 'src_mfone_pg')
    const s = await getSource(ctx, 'src_mfone_pg')
    expect(s.status).toBe('paused')
    await resumeSource(ctx, 'src_mfone_pg')
    const back = await getSource(ctx, 'src_mfone_pg')
    expect(back.status).toBe('healthy')
  })
  it('getSourceEvents returns events', async () => {
    const evts = await getSourceEvents(ctx, 'src_mfone_pg')
    expect(evts.length).toBeGreaterThan(0)
  })
})
