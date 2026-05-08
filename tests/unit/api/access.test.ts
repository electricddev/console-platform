import { describe, it, expect } from 'vitest'
import { listGrants, grantAccess, revokeAccess } from '@/lib/api/endpoints/access'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('access endpoints', () => {
  it('listGrants returns grants', async () => {
    const g = await listGrants(ctx)
    expect(g.length).toBeGreaterThan(0)
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
