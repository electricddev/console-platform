import { describe, it, expect } from 'vitest'
import { acredRedFlagRules, evaluateAcredRedFlags } from '@/lib/data/acred/red-flags'
import { acredFacts } from '@/lib/data/acred/facts'

describe('acredRedFlagRules', () => {
  it('exposes 8 rules', () => {
    expect(acredRedFlagRules.length).toBe(8)
  })

  it('each rule has a unique id', () => {
    const ids = new Set(acredRedFlagRules.map((r) => r.id))
    expect(ids.size).toBe(acredRedFlagRules.length)
  })
})

describe('evaluateAcredRedFlags', () => {
  it('runs every rule against the canonical snapshot without throwing', () => {
    const flags = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts)
    expect(Array.isArray(flags)).toBe(true)
    flags.forEach((f) => {
      expect(f.id).toMatch(/^acred\./)
      expect(['low', 'medium', 'high']).toContain(f.severity)
    })
  })

  it('emits a tripped non-accrual flag when nonAccrualPct delta > 20bps', () => {
    const flags = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts)
    expect(flags.some((f) => f.id === 'acred.non_accrual_rising')).toBe(true)
  })

  it('drillHrefs are well-formed', () => {
    const flags = evaluateAcredRedFlags(acredFacts.snapshot, acredFacts)
    flags.forEach((f) => {
      if (f.drillHref) {
        expect(f.drillHref).toMatch(/^\/datasets\/ds_acred(\/(explore|amm))?(\?[^#]*)?(#[^?]*)?$/)
      }
    })
  })

  it('a non-tripping snapshot returns no flags', () => {
    const flat = structuredClone(acredFacts.snapshot)
    // Zero out every delta + bring everything below thresholds:
    flat.vitals.nonAccrualPct = { value: 0.8, delta: 0, deltaKind: 'pp', tone: 'neutral' }
    flat.vitals.leverage      = { value: 0.5, delta: 0, deltaKind: 'pp', tone: 'neutral' }
    flat.vitals.top10ConcentrationPct = { value: 20, delta: 0, deltaKind: 'pp', tone: 'neutral' }
    flat.vitals.pikPct        = { value: 3.0, delta: 0, deltaKind: 'pp', tone: 'neutral' }
    flat.vitals.nav           = { value: 1e9, delta: 0, deltaKind: 'pct', tone: 'neutral' }
    flat.vitals.netFlow       = { value: 1e6, delta: 0, deltaKind: 'abs', tone: 'neutral' }
    const flagged = evaluateAcredRedFlags(flat, {
      ...acredFacts, flaggedHoldings: { nonAccrual: 0, pik: 0, softwareIndustry: 0 },
    })
    expect(flagged.length).toBe(0)
  })
})
