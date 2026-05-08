import { describe, it, expect } from 'vitest'
import { listGrants, grantAccess, revokeAccess } from '@/lib/api/endpoints/access'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('access endpoints', () => {
  it('listGrants returns grants', async () => {
    const g = await listGrants(ctx)
    expect(g.length).toBeGreaterThan(0)
  })
  it('listGrants returns only grants for the calling org\'s datasets', async () => {
    // org_tradefin owns ds_mfone (per fixtures); fixtures include grants for ds_mfone (gauntlet, infinifi) AND ds_creditbridge (bitwise) — only the first two should be visible.
    const grants = await listGrants(ctx)
    expect(grants.every((g) => g.datasetId === 'ds_mfone' || g.datasetId === 'ds_flowcredit_apac')).toBe(true)
    // Specifically, the bitwise/ds_creditbridge grant should be excluded.
    expect(grants.find((g) => g.counterpartyOrgId === 'org_bitwise')).toBeUndefined()
  })
  it('grantAccess + revokeAccess', async () => {
    const g = await grantAccess(ctx, {
      counterpartyOrgId: 'org_bitwise',
      datasetId: 'ds_mfone',
      level: 'execute',
      rateLimitPerDay: 25,
      allowedTemplateIds: [],
    })
    expect(g.id).toMatch(/^agr_/)
    await revokeAccess(ctx, g.id)
    const after = await listGrants(ctx)
    expect(after.find((x) => x.id === g.id)?.level).toBe('none')
  })
})
