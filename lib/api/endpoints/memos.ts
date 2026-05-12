import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { MemoSchema, MemoSectionSchema, FlagDecisionSchema, type Memo, type MemoSection, type FlagDecision } from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'

type SectionKey = keyof Memo['sections']

function findMemo(memoId: string): Memo {
  const memo = store.getMemos().find((m) => m.id === memoId)
  if (!memo) throw new MockApiError(`Memo ${memoId} not found`, 404)
  return memo
}

export const getActiveMemo = mockEndpoint(
  async (ctx: RequestContext, _signal, datasetId: string): Promise<Memo> => {
    const authorId = ctx.user?.id ?? 'anonymous'

    // Admin users: surface the most recently updated non-draft memo (submitted or
    // approved) so they can review, approve, or see the outcome. Fall through to
    // own-draft creation only when nothing actionable exists.
    if (ctx.user?.role === 'admin') {
      const reviewable = store.getMemos()
        .filter((m) => m.datasetId === datasetId && m.status !== 'draft')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      if (reviewable.length > 0) return MemoSchema.parse(reviewable[0])
    }

    const existing = store.getMemos().find((m) =>
      m.datasetId === datasetId && m.authorId === authorId && m.status !== 'approved'
    )
    if (existing) return MemoSchema.parse(existing)

    const now = new Date().toISOString()
    const fresh: Memo = {
      id: `memo_${datasetId}_${Date.now()}`,
      datasetId, authorId,
      status: 'draft', createdAt: now, updatedAt: now,
      sections: {
        character:  { markdown: '', inserts: [] }, capacity:   { markdown: '', inserts: [] },
        capital:    { markdown: '', inserts: [] }, collateral: { markdown: '', inserts: [] },
        conditions: { markdown: '', inserts: [] },
      },
      flagDecisions: [],
    }
    store.upsertMemo(fresh)
    return MemoSchema.parse(fresh)
  },
  { latencyMs: 100 }
)

export const updateMemoSection = mockEndpoint(
  async (_ctx: RequestContext, _signal, memoId: string, sectionKey: SectionKey, section: MemoSection): Promise<Memo> => {
    const parsed = MemoSectionSchema.parse(section)
    const memo = findMemo(memoId)
    if (memo.status !== 'draft') throw new MockApiError('Memo is locked for edits', 409)
    const next: Memo = {
      ...memo,
      updatedAt: new Date().toISOString(),
      sections: { ...memo.sections, [sectionKey]: parsed },
    }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 80 }
)

export const recordFlagDecision = mockEndpoint(
  async (_ctx: RequestContext, _signal, memoId: string, decision: FlagDecision): Promise<Memo> => {
    const parsed = FlagDecisionSchema.parse(decision)
    const memo = findMemo(memoId)
    if (memo.status !== 'draft') throw new MockApiError('Memo is locked for edits', 409)
    const filtered = memo.flagDecisions.filter((d) => d.flagId !== parsed.flagId)
    const next: Memo = {
      ...memo,
      updatedAt: new Date().toISOString(),
      flagDecisions: [...filtered, parsed],
    }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 80 }
)

export const submitMemo = mockEndpoint(
  async (_ctx: RequestContext, _signal, memoId: string): Promise<Memo> => {
    const memo = findMemo(memoId)
    if (memo.status !== 'draft') throw new MockApiError(`Cannot submit from ${memo.status}`, 409)
    const now = new Date().toISOString()
    const next: Memo = { ...memo, status: 'submitted', submittedAt: now, updatedAt: now }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 120 }
)

export const approveMemo = mockEndpoint(
  async (ctx: RequestContext, _signal, memoId: string): Promise<Memo> => {
    if (ctx.user?.role !== 'admin') throw new MockApiError('Admin role required', 403)
    const memo = findMemo(memoId)
    if (memo.status !== 'submitted') throw new MockApiError(`Cannot approve from ${memo.status}`, 409)
    const now = new Date().toISOString()
    const next: Memo = { ...memo, status: 'approved', approvedAt: now, approvedBy: ctx.user.id, updatedAt: now }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 120 }
)

export const requestMemoChanges = mockEndpoint(
  async (ctx: RequestContext, _signal, memoId: string, note: string): Promise<Memo> => {
    if (ctx.user?.role !== 'admin') throw new MockApiError('Admin role required', 403)
    const memo = findMemo(memoId)
    if (memo.status !== 'submitted') throw new MockApiError(`Cannot request changes from ${memo.status}`, 409)
    void note
    const now = new Date().toISOString()
    const next: Memo = { ...memo, status: 'draft', updatedAt: now }
    store.upsertMemo(next)
    return MemoSchema.parse(next)
  },
  { latencyMs: 100 }
)
