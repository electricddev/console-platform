import { describe, it, expect } from 'vitest'
import { listApprovals, getApproval, approveRequest, denyRequest, requestChanges, simulatePrivate } from '@/lib/api/endpoints/approvals'

const ctx = { user: { id: 'usr_tom', orgId: 'org_tradefin', role: 'originator' as const } }

describe('approval endpoints', () => {
  it('listApprovals returns pending', async () => {
    const list = await listApprovals(ctx, { state: 'pending' })
    expect(list.every((a) => a.state === 'pending')).toBe(true)
  })
  it('approveRequest flips state and signs', async () => {
    const a = (await listApprovals(ctx, { state: 'pending' }))[0]
    const r = await approveRequest(ctx, { approvalId: a.id })
    expect(r.state).toBe('approved')
    expect(r.signature).toBeTruthy()
  })
  it('simulatePrivate returns synthetic shape but no leaked values', async () => {
    const r = await simulatePrivate(ctx, { approvalId: 'apv_001' })
    expect(r.summary).toBeTruthy()
    expect((r as unknown as { rawValues?: unknown }).rawValues).toBeUndefined()
  })
})

// Suppress unused import warnings — these exports are part of the public API surface.
void getApproval
void denyRequest
void requestChanges
