import { describe, it, expect } from 'vitest'
import { MemoSchema, MemoStatusSchema, MemoSectionSchema, MemoInsertSchema, FlagDecisionSchema } from '@/lib/api/schemas'

describe('memo schemas', () => {
  it('MemoStatusSchema is closed', () => {
    expect(MemoStatusSchema.options).toEqual(['draft', 'submitted', 'approved'])
  })

  it('MemoSectionSchema defaults markdown="" and inserts=[]', () => {
    const parsed = MemoSectionSchema.parse({})
    expect(parsed.markdown).toBe('')
    expect(parsed.inserts).toEqual([])
  })

  it('MemoInsertSchema parses', () => {
    expect(() => MemoInsertSchema.parse({
      id: 'ins_1', methodologyId: 'acred.top10_borrowers', insertedAt: '2026-05-12T10:00:00.000Z',
    })).not.toThrow()
  })

  it('FlagDecisionSchema rejects invalid actions', () => {
    expect(() => FlagDecisionSchema.parse({
      flagId: 'f1', action: 'rejected', note: 'x', decidedAt: '2026-05-12T10:00:00.000Z', decidedBy: 'u1',
    })).toThrow()
  })

  it('MemoSchema parses a minimal draft', () => {
    expect(() => MemoSchema.parse({
      id: 'memo_1', datasetId: 'ds_acred', authorId: 'u1', status: 'draft',
      createdAt: '2026-05-12T00:00:00.000Z', updatedAt: '2026-05-12T00:00:00.000Z',
      sections: {
        character: { markdown: '', inserts: [] }, capacity: { markdown: '', inserts: [] },
        capital: { markdown: '', inserts: [] }, collateral: { markdown: '', inserts: [] },
        conditions: { markdown: '', inserts: [] },
      },
    })).not.toThrow()
  })
})
