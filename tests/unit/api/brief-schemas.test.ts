import { describe, it, expect } from 'vitest'
import { RedFlagSchema, AnomalyEventSchema } from '@/lib/api/schemas'

describe('RedFlagSchema', () => {
  it('parses', () => {
    expect(() => RedFlagSchema.parse({
      id: 'non-accrual-rising', label: 'Non-accrual % rose 21bps QoQ',
      severity: 'medium', reason: 'Crossed 1.4% in Q1 2026', drillHref: '/datasets/ds_acred/explore?table=holdings&filter=non_accrual',
    })).not.toThrow()
  })
})

describe('AnomalyEventSchema', () => {
  it('parses with nullable borrower and href', () => {
    expect(() => AnomalyEventSchema.parse({
      id: 'evt_1', occurredAt: '2026-04-29T00:00:00.000Z', kind: 'filing',
      severity: 'info', title: 'Q1 2026 N-PORT loaded', borrowerNormalized: null, detailHref: null,
    })).not.toThrow()
  })
})
