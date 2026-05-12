import type { BriefSnapshot } from '@/lib/api/schemas'

/**
 * Canonical snapshot for the ACRED monitoring brief. Hand-computed from
 * the parquet truth at lib/data/acred/parquet. Refresh when parquet
 * changes — guarded by tests/unit/data/acred-facts.test.ts shape check.
 *
 * Numbers are illustrative of the latest available N-PORT period in the
 * fixture set; values approximate Apollo Diversified Credit's public
 * disclosures and should be updated when newer filings are loaded.
 */
export const acredFacts: {
  snapshot: BriefSnapshot
  /** Counts used for "view N flagged holdings" drill links. */
  flaggedHoldings: { nonAccrual: number; pik: number; softwareIndustry: number }
  /** Aggregated portfolio numbers needed by the AMM and counterfactual panels. */
  portfolio: { totalFairValue: number; uniqueBorrowers: number }
} = {
  snapshot: {
    periodEnd: '2026-03-31T00:00:00.000Z',
    priorPeriodEnd: '2025-12-31T00:00:00.000Z',
    vitals: {
      nav:                   { value: 1_612_000_000, delta: -0.011, deltaKind: 'pct', tone: 'negative' },
      leverage:              { value: 0.730,         delta:  0.4,   deltaKind: 'pp',  tone: 'negative' },
      nonAccrualPct:         { value: 1.42,          delta:  0.21,  deltaKind: 'pp',  tone: 'negative' },
      top10ConcentrationPct: { value: 32.4,          delta:  1.8,   deltaKind: 'pp',  tone: 'negative' },
      pikPct:                { value: 8.3,           delta:  1.1,   deltaKind: 'pp',  tone: 'negative' },
      netFlow:               { value: -23_000_000,   delta: -45_000_000, deltaKind: 'abs', tone: 'negative' },
    },
  },
  flaggedHoldings: { nonAccrual: 12, pik: 18, softwareIndustry: 41 },
  portfolio: { totalFairValue: 1_612_000_000, uniqueBorrowers: 308 },
}
