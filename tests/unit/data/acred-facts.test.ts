import { describe, it, expect } from 'vitest'
import { BriefSnapshotSchema } from '@/lib/api/schemas'
import { acredFacts } from '@/lib/data/acred/facts'

describe('acredFacts', () => {
  it('parses against BriefSnapshotSchema', () => {
    expect(() => BriefSnapshotSchema.parse(acredFacts.snapshot)).not.toThrow()
  })

  it('has prior period strictly before current period', () => {
    expect(new Date(acredFacts.snapshot.priorPeriodEnd).getTime())
      .toBeLessThan(new Date(acredFacts.snapshot.periodEnd).getTime())
  })

  it('declares the holdings flagged on each rule for drill targets', () => {
    expect(acredFacts.flaggedHoldings.nonAccrual).toBeGreaterThanOrEqual(1)
  })
})
