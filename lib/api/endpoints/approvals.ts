import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { ApprovalRequestSchema } from '@/lib/api/schemas'
import type { ApprovalRequest } from '@/lib/api/types'

const state: ApprovalRequest[] = fixtures.approvals.map((a) => ({ ...a }))

export type ApprovalFilters = { state?: ApprovalRequest['state'] }

export const listApprovals = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: ApprovalFilters = {}): Promise<ApprovalRequest[]> => {
    let list = state.slice()
    if (filters.state) list = list.filter((a) => a.state === filters.state)
    return list.map((a) => ApprovalRequestSchema.parse(a))
  },
  { latencyMs: 140 }
)

export const getApproval = mockEndpoint(
  async (_ctx: RequestContext, _signal, approvalId: string): Promise<ApprovalRequest> => {
    const a = state.find((x) => x.id === approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 100 }
)

export const approveRequest = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { approvalId: string; constraintsJson?: string }) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const a = state.find((x) => x.id === input.approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    a.state = 'approved'
    a.decidedAt = new Date().toISOString()
    a.decidedBy = ctx.user.id
    a.signature = '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, '0')
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 260 }
)

export const denyRequest = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { approvalId: string; rationale: string }) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const a = state.find((x) => x.id === input.approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    a.state = 'denied'
    a.decidedAt = new Date().toISOString()
    a.decidedBy = ctx.user.id
    a.rationale = input.rationale
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 200 }
)

export const requestChanges = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { approvalId: string; rationale: string }) => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const a = state.find((x) => x.id === input.approvalId)
    if (!a) throw new MockApiError('Approval not found', 404)
    a.state = 'changes-requested'
    a.decidedAt = new Date().toISOString()
    a.decidedBy = ctx.user.id
    a.rationale = input.rationale
    return ApprovalRequestSchema.parse(a)
  },
  { latencyMs: 200 }
)

/** Private simulation result. The originator sees a summary — never raw rows. */
export type PrivateSimulationResult = {
  summary: string
  bucketCount: number
  smallestBucket: number
  rowEstimate: number
  durationMs: number
}

export const simulatePrivate = mockEndpoint(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_ctx: RequestContext, _signal, _input: { approvalId: string }): Promise<PrivateSimulationResult> => {
    // Deterministic mock — no rows leak.
    return {
      summary: 'Aggregation produces 5 buckets, smallest of size 12. No bucket falls below k-anonymity (k=10).',
      bucketCount: 5,
      smallestBucket: 12,
      rowEstimate: 487,
      durationMs: 1240,
    }
  },
  { latencyMs: 380 }
)
