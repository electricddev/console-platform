import { describe, it, expect } from 'vitest'
import { evaluateAcredRedFlags } from '@/lib/data/acred/red-flags'
import { acredFacts } from '@/lib/data/acred/facts'
import type { Threshold } from '@/lib/api/schemas'

const NOW = new Date().toISOString()

describe('evaluateAcredRedFlags with thresholds', () => {
  it('default behavior unchanged when thresholds=[]', () => {
    const flagsDefault = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts)
    const flagsEmpty   = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, [])
    expect(flagsEmpty.map((f) => f.id)).toEqual(flagsDefault.map((f) => f.id))
  })

  it('raising the leverage threshold above the current value drops the leverage_high flag', () => {
    const thresholds: Threshold[] = [{
      id: 't1', ruleId: 'acred.leverage_high', datasetId: 'ds_acred',
      metric: 'leverage', value: 0.90, direction: 'above',
      setBy: 'u1', setAt: NOW,
    }]
    const ids = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, thresholds).map((f) => f.id)
    expect(ids).not.toContain('acred.leverage_high')
  })

  it('lowering the non-accrual delta threshold trips the non_accrual_rising flag at lower deltas', () => {
    const thresholds: Threshold[] = [{
      id: 't2', ruleId: 'acred.non_accrual_rising', datasetId: 'ds_acred',
      metric: 'non_accrual_delta', value: 0.05, direction: 'above',
      setBy: 'u1', setAt: NOW,
    }]
    const ids = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts, thresholds).map((f) => f.id)
    expect(ids).toContain('acred.non_accrual_rising')
  })
})
