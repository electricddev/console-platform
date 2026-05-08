import { describe, it, expect } from 'vitest'
import { listAudit, getAuditEntry, exportAuditBundle } from '@/lib/api/endpoints/audit'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('audit endpoints', () => {
  it('listAudit returns entries sorted descending', async () => {
    const list = await listAudit(ctx, {})
    for (let i = 1; i < list.length; i++) {
      expect(list[i - 1].timestamp >= list[i].timestamp).toBe(true)
    }
  })
  it('listAudit filters by actor', async () => {
    const list = await listAudit(ctx, { actorId: 'usr_maya' })
    expect(list.every((e) => e.actorId === 'usr_maya')).toBe(true)
  })
  it('listAudit filters by resourceType', async () => {
    const list = await listAudit(ctx, { resourceType: 'run' })
    expect(list.every((e) => e.resourceType === 'run')).toBe(true)
  })
  it('exportAuditBundle returns a signed bundle string', async () => {
    const bundle = await exportAuditBundle(ctx, {})
    expect(bundle).toMatch(/"entries":\s*\[/)
    expect(bundle).toMatch(/"signature":/)
  })
})
