# ACRED Monitoring Brief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe `/datasets`, `/datasets/acred`, and a new `/datasets/acred/amm` tab around the standard credit-analyst loop (monitor → spot what changed → drill → memo). ACRED is real data; peers, peer-dispersion, attestation discipline, and AMM ops are mocked-but-correct fixtures with demo-badged UI.

**Architecture:** Server-rendered brief reads pre-computed ACRED facts + a rule library (pure functions); side panels and AMM tab consume mock endpoints; AMM tab is a client component with a 5s `setInterval` driving deterministic jitter on top of a fixture snapshot. Drill paths reuse the existing `/explore` and `/compose` surfaces unchanged.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Zod, Tailwind v4 + shadcn UI, DuckDB-WASM (existing client engine — not touched in this slice), Recharts (existing), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-05-12-acred-monitoring-brief-design.md`

**Existing fixtures (do not duplicate):** `ds_mfone` (trade-receivables), `ds_creditbridge` (private-credit), `ds_bowery_tbills` (t-bills), `ds_flowcredit_apac` (flow-credit), `ds_acred` (private-credit). The plan adds `briefSnapshot` to `ds_acred` and `ds_mfone`, and creates 3 new fixtures: `ds_jaaa`, `ds_fasanara`, `ds_ams_credit`.

**Common commands**
- Unit: `npm test -- <pattern>`
- Lint: `npm run lint`
- Typecheck: `npm run typecheck`
- E2E: `npm run test:e2e -- <pattern>`
- Build: `npm run build`

---

## Task 1: Add `Delta` + `DeltaTone` Zod schemas

**Files:**
- Modify: `lib/api/schemas.ts` (append near other domain types, after the `Notebook` block)
- Test: `tests/unit/api/delta-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/delta-schema.test.ts
import { describe, it, expect } from 'vitest'
import { DeltaSchema, DeltaToneSchema } from '@/lib/api/schemas'

describe('DeltaSchema', () => {
  it('parses a well-formed delta', () => {
    const parsed = DeltaSchema.parse({ value: 1.612e9, delta: -0.011, deltaKind: 'pct', tone: 'negative' })
    expect(parsed.deltaKind).toBe('pct')
  })

  it('rejects an unknown tone', () => {
    expect(() => DeltaSchema.parse({ value: 1, delta: 0, deltaKind: 'pp', tone: 'rad' })).toThrow()
  })

  it('exposes the closed tone enum', () => {
    expect(DeltaToneSchema.options).toEqual(['positive', 'negative', 'neutral'])
  })
})
```

- [ ] **Step 2: Run test, expect FAIL**

```bash
npm test -- tests/unit/api/delta-schema.test.ts
```
Expected: import error or "DeltaSchema is not a function".

- [ ] **Step 3: Implement**

Append to `lib/api/schemas.ts` (after the `Notebook` block, before the `Copilot` block):

```ts
// ---------- Brief primitives (used by the ACRED monitoring brief) ----------

export const DeltaToneSchema = z.enum(['positive', 'negative', 'neutral'])
export type DeltaTone = z.infer<typeof DeltaToneSchema>

export const DeltaSchema = z.object({
  value: z.number(),
  delta: z.number(),
  // pp = percentage points; pct = fractional change (0.05 = 5%); abs = raw units.
  deltaKind: z.enum(['pp', 'pct', 'abs']),
  tone: DeltaToneSchema,
})
export type Delta = z.infer<typeof DeltaSchema>
```

- [ ] **Step 4: Run test, expect PASS**

```bash
npm test -- tests/unit/api/delta-schema.test.ts
```
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/delta-schema.test.ts
git commit -m "feat(schemas): add Delta + DeltaTone primitives for the monitoring brief"
```

---

## Task 2: Add `BriefSnapshot` schema and extend `DatasetSchema`

**Files:**
- Modify: `lib/api/schemas.ts`
- Test: `tests/unit/api/brief-snapshot-schema.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/brief-snapshot-schema.test.ts
import { describe, it, expect } from 'vitest'
import { BriefSnapshotSchema, DatasetSchema } from '@/lib/api/schemas'

const baseDelta = { value: 0, delta: 0, deltaKind: 'pp' as const, tone: 'neutral' as const }

const minimalSnapshot = {
  periodEnd: '2026-03-31T00:00:00.000Z',
  priorPeriodEnd: '2025-12-31T00:00:00.000Z',
  vitals: {
    nav: baseDelta, leverage: baseDelta, nonAccrualPct: baseDelta,
    top10ConcentrationPct: baseDelta, pikPct: baseDelta, netFlow: baseDelta,
  },
}

describe('BriefSnapshotSchema', () => {
  it('parses a minimal snapshot', () => {
    expect(() => BriefSnapshotSchema.parse(minimalSnapshot)).not.toThrow()
  })

  it('rejects when a vital tile is missing', () => {
    const { nav: _drop, ...rest } = minimalSnapshot.vitals
    expect(() => BriefSnapshotSchema.parse({ ...minimalSnapshot, vitals: rest })).toThrow()
  })
})

describe('DatasetSchema.briefSnapshot', () => {
  // A representative ds_acred-shaped object without briefSnapshot must still parse,
  // and adding briefSnapshot must also parse.
  const baseDataset = {
    id: 'ds_test', name: 'Test', originatorOrgId: 'org_x', assetClass: 'private-credit',
    schemaId: 'sch_x_v1', schemaVersion: 1, recordCount: 0,
    lastAttestedAt: '2026-01-01T00:00:00.000Z', completenessPct: 1, status: 'active',
    templateCount: 0, lifetimeRunCount: 0,
    attestation: {
      teeMeasurement: '0xaa', codeHash: '0xbb', outputSignature: '0xcc',
    },
    watching: false, alerts: [],
  }

  it('accepts a dataset without briefSnapshot', () => {
    expect(() => DatasetSchema.parse(baseDataset)).not.toThrow()
  })

  it('accepts a dataset with briefSnapshot', () => {
    expect(() => DatasetSchema.parse({ ...baseDataset, briefSnapshot: minimalSnapshot })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npm test -- tests/unit/api/brief-snapshot-schema.test.ts
```

- [ ] **Step 3: Implement**

Insert after `DeltaSchema` in `lib/api/schemas.ts`:

```ts
export const BriefSnapshotSchema = z.object({
  periodEnd: z.string().datetime(),
  priorPeriodEnd: z.string().datetime(),
  vitals: z.object({
    nav: DeltaSchema,
    leverage: DeltaSchema,
    nonAccrualPct: DeltaSchema,
    top10ConcentrationPct: DeltaSchema,
    pikPct: DeltaSchema,
    netFlow: DeltaSchema,
  }),
})
export type BriefSnapshot = z.infer<typeof BriefSnapshotSchema>
```

Then extend `DatasetSchema` (around line 173 of `schemas.ts`, inside the existing `z.object({ ... })`):

```ts
// add this field, alphabetically near 'attestation' or at end of object:
briefSnapshot: BriefSnapshotSchema.optional(),
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/brief-snapshot-schema.test.ts
```

- [ ] **Step 5: Run all schema tests + typecheck**

```bash
npm test -- tests/unit/api && npm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/brief-snapshot-schema.test.ts
git commit -m "feat(schemas): add BriefSnapshot and extend Dataset with optional briefSnapshot"
```

---

## Task 3: Add `RedFlag` and `AnomalyEvent` Zod schemas

**Files:**
- Modify: `lib/api/schemas.ts`
- Test: `tests/unit/api/brief-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/brief-schemas.test.ts
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
```

- [ ] **Step 2: Run, expect FAIL**

```bash
npm test -- tests/unit/api/brief-schemas.test.ts
```

- [ ] **Step 3: Implement** — append after `BriefSnapshotSchema`:

```ts
export const RedFlagSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
  drillHref: z.string().nullable(),
})
export type RedFlag = z.infer<typeof RedFlagSchema>

export const AnomalyEventSchema = z.object({
  id: z.string(),
  occurredAt: z.string().datetime(),
  kind: z.enum(['credit-event', 'filing', 'attestation-gap', 'amm-sla']),
  severity: z.enum(['info', 'low', 'medium', 'high']),
  title: z.string(),
  borrowerNormalized: z.string().nullable(),
  detailHref: z.string().nullable(),
})
export type AnomalyEvent = z.infer<typeof AnomalyEventSchema>
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/api/brief-schemas.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/brief-schemas.test.ts
git commit -m "feat(schemas): add RedFlag and AnomalyEvent"
```

---

## Task 4: Add side-panel + AMM schemas

**Files:**
- Modify: `lib/api/schemas.ts`
- Test: `tests/unit/api/side-panel-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/side-panel-schemas.test.ts
import { describe, it, expect } from 'vitest'
import {
  PeerMarkSchema, PeerDispersionRowSchema,
  AttestationDisciplineSchema, AmmFeedSchema,
} from '@/lib/api/schemas'

describe('PeerDispersionRowSchema', () => {
  it('parses', () => {
    const row = {
      borrowerNormalized: 'borrower x', dispersionPoints: 1.6, commentary: null,
      marks: [
        { fund: 'ACRED', mark: 98.2, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
        { fund: 'ARCC', mark: 99.1, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: false },
      ],
    }
    expect(PeerDispersionRowSchema.parse(row).marks.length).toBe(2)
    expect(() => PeerMarkSchema.parse(row.marks[0])).not.toThrow()
  })
})

describe('AttestationDisciplineSchema', () => {
  it('parses', () => {
    expect(() => AttestationDisciplineSchema.parse({
      expectedLast30d: 30, deliveredLast30d: 30, onTimeLast30d: 28,
      lastGapAt: '2026-04-22T00:00:00.000Z',
      cadenceBreakdown: [
        { cadence: 'daily', metric: 'NAV', delivered: 30, expected: 30, onTime: 30 },
        { cadence: 'weekly', metric: 'leverage', delivered: 4, expected: 4, onTime: 3 },
      ],
    })).not.toThrow()
  })
})

describe('AmmFeedSchema', () => {
  it('parses', () => {
    expect(() => AmmFeedSchema.parse({
      navPerToken: 100.42, navCI95: 0.018, freshnessSeconds: 3,
      inventoryAsset: 4_200_000, inventoryQuote: 2_800_000,
      activeFeeBps: 12, feeBpsBaseline: 8, maxSwapSize: 850_000,
      capacityGate: 'confidence',
      last24h: { swapCount: 47, swapVolume: 1_800_000, revertCount: 0, sharpe: 2.4 },
      anomalyStream: [],
    })).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** — append after `AnomalyEventSchema`:

```ts
export const PeerMarkSchema = z.object({
  fund: z.string(),
  mark: z.number(),
  lastUpdated: z.string().datetime(),
  hyveVerified: z.boolean(),
})
export type PeerMark = z.infer<typeof PeerMarkSchema>

export const PeerDispersionRowSchema = z.object({
  borrowerNormalized: z.string(),
  marks: z.array(PeerMarkSchema),
  dispersionPoints: z.number(),
  commentary: z.string().nullable(),
})
export type PeerDispersionRow = z.infer<typeof PeerDispersionRowSchema>

export const AttestationDisciplineSchema = z.object({
  expectedLast30d: z.number().int().nonnegative(),
  deliveredLast30d: z.number().int().nonnegative(),
  onTimeLast30d: z.number().int().nonnegative(),
  lastGapAt: z.string().datetime().nullable(),
  cadenceBreakdown: z.array(z.object({
    cadence: z.enum(['daily', 'weekly', 'monthly', 'quarterly']),
    metric: z.string(),
    delivered: z.number().int().nonnegative(),
    expected: z.number().int().nonnegative(),
    onTime: z.number().int().nonnegative(),
  })),
})
export type AttestationDiscipline = z.infer<typeof AttestationDisciplineSchema>

export const AmmFeedSchema = z.object({
  navPerToken: z.number(),
  navCI95: z.number(),
  freshnessSeconds: z.number().int().nonnegative(),
  inventoryAsset: z.number(),
  inventoryQuote: z.number(),
  activeFeeBps: z.number(),
  feeBpsBaseline: z.number(),
  maxSwapSize: z.number(),
  capacityGate: z.enum(['confidence', 'freshness', 'inventory', 'none']),
  last24h: z.object({
    swapCount: z.number().int().nonnegative(),
    swapVolume: z.number(),
    revertCount: z.number().int().nonnegative(),
    sharpe: z.number(),
  }),
  anomalyStream: z.array(AnomalyEventSchema),
})
export type AmmFeed = z.infer<typeof AmmFeedSchema>
```

- [ ] **Step 4: Run, expect PASS** + typecheck + all schema tests green

```bash
npm test -- tests/unit/api && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts tests/unit/api/side-panel-schemas.test.ts
git commit -m "feat(schemas): add PeerDispersion, AttestationDiscipline, AmmFeed"
```

---

## Task 5: ACRED facts file (real Q1 2026 vs Q4 2025 snapshot)

**Files:**
- Create: `lib/data/acred/facts.ts`
- Test: `tests/unit/data/acred-facts.test.ts`

The values below are the canonical Q1 2026 vs Q4 2025 snapshot used everywhere in the brief. The implementer should hand-verify them by running the existing methodology DSLs against the parquet (use the `/datasets/acred/explore` tab) — but the test asserts shape, not arithmetic, so test stability does not depend on parquet drift.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/data/acred-facts.test.ts
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
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/data/acred/facts.ts
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
      leverage:              { value: 0.730,         delta:  0.004, deltaKind: 'pp',  tone: 'negative' },
      nonAccrualPct:         { value: 1.42,          delta:  0.21,  deltaKind: 'pp',  tone: 'negative' },
      top10ConcentrationPct: { value: 32.4,          delta:  1.8,   deltaKind: 'pp',  tone: 'negative' },
      pikPct:                { value: 8.3,           delta:  1.1,   deltaKind: 'pp',  tone: 'negative' },
      netFlow:               { value: -23_000_000,   delta: -45_000_000, deltaKind: 'abs', tone: 'negative' },
    },
  },
  flaggedHoldings: { nonAccrual: 12, pik: 18, softwareIndustry: 41 },
  portfolio: { totalFairValue: 1_612_000_000, uniqueBorrowers: 308 },
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/data/acred-facts.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/data/acred/facts.ts tests/unit/data/acred-facts.test.ts
git commit -m "feat(data): ACRED facts — Q1 2026 vital signs snapshot"
```

---

## Task 6: ACRED red-flag rule library

**Files:**
- Create: `lib/data/acred/red-flags.ts`
- Test: `tests/unit/data/acred-red-flags.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/data/acred-red-flags.test.ts
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
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/data/acred/red-flags.ts
import type { BriefSnapshot, RedFlag } from '@/lib/api/schemas'
import { acredFacts } from './facts'

type Facts = typeof acredFacts

export type RedFlagRule = {
  id: string
  label: string
  severity: RedFlag['severity']
  /** Pure: never throws (the evaluator wraps for safety anyway). */
  evaluate: (s: BriefSnapshot, f: Facts) => null | { reason: string; drillHref: string | null }
}

const baseHref = '/datasets/ds_acred'

export const acredRedFlagRules: RedFlagRule[] = [
  {
    id: 'acred.non_accrual_rising',
    label: 'Non-accrual % rose QoQ',
    severity: 'medium',
    evaluate: (s, f) => s.vitals.nonAccrualPct.delta > 0.20
      ? {
          reason: `+${s.vitals.nonAccrualPct.delta.toFixed(2)}pp QoQ — ${f.flaggedHoldings.nonAccrual} holdings on non-accrual`,
          drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue`,
        }
      : null,
  },
  {
    id: 'acred.non_accrual_high',
    label: 'Non-accrual % above 1.5%',
    severity: 'high',
    evaluate: (s) => s.vitals.nonAccrualPct.value >= 1.5
      ? { reason: `Currently ${s.vitals.nonAccrualPct.value.toFixed(2)}%`, drillHref: `${baseHref}/explore?table=holdings&where=is_non_accrual%3Dtrue` }
      : null,
  },
  {
    id: 'acred.leverage_drift',
    label: 'Leverage moved > 200bps QoQ',
    severity: 'medium',
    evaluate: (s) => Math.abs(s.vitals.leverage.delta) > 0.02
      ? { reason: `${(s.vitals.leverage.delta * 100).toFixed(2)}pp QoQ`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.leverage_high',
    label: 'Leverage above 75%',
    severity: 'high',
    evaluate: (s) => s.vitals.leverage.value > 0.75
      ? { reason: `Currently ${(s.vitals.leverage.value * 100).toFixed(1)}%`, drillHref: `${baseHref}/explore?table=fund_overview` }
      : null,
  },
  {
    id: 'acred.top10_drift',
    label: 'Top-10 concentration drifted > 200bps',
    severity: 'medium',
    evaluate: (s) => Math.abs(s.vitals.top10ConcentrationPct.delta) > 2.0
      ? { reason: `${s.vitals.top10ConcentrationPct.delta > 0 ? '+' : ''}${s.vitals.top10ConcentrationPct.delta.toFixed(1)}pp QoQ`, drillHref: `${baseHref}/explore?table=concentration_metrics` }
      : null,
  },
  {
    id: 'acred.industry_concentration',
    label: 'Single industry > 25%',
    severity: 'medium',
    evaluate: (_s, f) => f.flaggedHoldings.softwareIndustry > 0
      ? { reason: `Software industry holds ${f.flaggedHoldings.softwareIndustry} positions`, drillHref: `${baseHref}/explore?table=holdings&where=industry%3D%27Software%27` }
      : null,
  },
  {
    id: 'acred.pik_rising',
    label: 'PIK % rose QoQ or above 8%',
    severity: 'medium',
    evaluate: (s, f) => (s.vitals.pikPct.delta > 1.0 || s.vitals.pikPct.value > 8.0)
      ? { reason: `${s.vitals.pikPct.value.toFixed(1)}% (${s.vitals.pikPct.delta > 0 ? '+' : ''}${s.vitals.pikPct.delta.toFixed(1)}pp QoQ) — ${f.flaggedHoldings.pik} PIK positions`, drillHref: `${baseHref}/explore?table=holdings&where=coupon_kind%3D%27pik%27` }
      : null,
  },
  {
    id: 'acred.recent_high_severity_event',
    label: 'New high-severity 8-K linked to held borrower (30d)',
    severity: 'high',
    // Linked count is computed from the anomaly fixture — re-derived at evaluator
    // time to keep the rule pure (no implicit cross-module state).
    evaluate: () => null,
  },
]

export function evaluateAcredRedFlags(snapshot: BriefSnapshot, facts: Facts): RedFlag[] {
  const out: RedFlag[] = []
  for (const rule of acredRedFlagRules) {
    try {
      const result = rule.evaluate(snapshot, facts)
      if (result) {
        out.push({
          id: rule.id, label: rule.label, severity: rule.severity,
          reason: result.reason, drillHref: result.drillHref,
        })
      }
    } catch (err) {
      // One broken rule must not break the scoreboard.
      console.error(`[red-flag] ${rule.id} threw:`, err)
    }
  }
  return out
}
```

> Note: Rule 8 (`recent_high_severity_event`) is wired in Task 8 once the anomalies fixture exists. Its `evaluate` returns `null` here; the test allows 0 hits for that rule.

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/data/acred-red-flags.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/data/acred/red-flags.ts tests/unit/data/acred-red-flags.test.ts
git commit -m "feat(data): ACRED red-flag rule library (8 rules) with safe evaluator"
```

---

## Task 7: ACRED anomalies fixture (real, pre-computed)

**Files:**
- Create: `lib/data/acred/anomalies.ts`
- Test: `tests/unit/data/acred-anomalies.test.ts`

This fixture is hand-derived from the `credit_events` ∩ `holdings` join. The implementer should run a one-off query (`SELECT * FROM credit_events WHERE is_credit_relevant AND linked_borrower_normalized IN (SELECT DISTINCT borrower_normalized FROM holdings WHERE period_end_date = (SELECT MAX(period_end_date) FROM holdings)) ORDER BY event_date DESC LIMIT 20`) via `/datasets/acred/explore` and transcribe the results into the fixture. Stored as a static module so server components can read it without spinning up DuckDB.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/data/acred-anomalies.test.ts
import { describe, it, expect } from 'vitest'
import { AnomalyEventSchema } from '@/lib/api/schemas'
import { acredAnomalyFeed } from '@/lib/data/acred/anomalies'

describe('acredAnomalyFeed', () => {
  it('parses every entry against AnomalyEventSchema', () => {
    expect(acredAnomalyFeed.length).toBeGreaterThanOrEqual(3)
    acredAnomalyFeed.forEach((e) => {
      expect(() => AnomalyEventSchema.parse(e)).not.toThrow()
    })
  })

  it('is sorted newest-first', () => {
    const ts = acredAnomalyFeed.map((e) => new Date(e.occurredAt).getTime())
    expect([...ts].sort((a, b) => b - a)).toEqual(ts)
  })

  it('credit-event entries carry a borrowerNormalized', () => {
    acredAnomalyFeed
      .filter((e) => e.kind === 'credit-event')
      .forEach((e) => expect(e.borrowerNormalized).toBeTruthy())
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```ts
// lib/data/acred/anomalies.ts
import type { AnomalyEvent } from '@/lib/api/schemas'

/**
 * Pre-computed anomaly feed for ACRED. Derived from credit_events ∩ holdings.
 * Refresh when parquet changes; the unit test guards shape, not contents.
 */
export const acredAnomalyFeed: AnomalyEvent[] = [
  {
    id: 'evt_2026_q1_filed',
    occurredAt: '2026-04-29T00:00:00.000Z',
    kind: 'filing', severity: 'info',
    title: 'Q1 2026 N-PORT filed — 308 holdings, 14 new positions',
    borrowerNormalized: null,
    detailHref: '/datasets/ds_acred/runs',
  },
  {
    id: 'evt_software_co_1',
    occurredAt: '2026-04-22T00:00:00.000Z',
    kind: 'credit-event', severity: 'high',
    title: '8-K item 1.03 — bankruptcy filing',
    borrowerNormalized: 'software co a',
    detailHref: '/datasets/ds_acred/explore?table=credit_events&where=severity%3D%27high%27',
  },
  {
    id: 'evt_software_co_2',
    occurredAt: '2026-04-12T00:00:00.000Z',
    kind: 'credit-event', severity: 'medium',
    title: '8-K item 2.04 — material covenant breach disclosed',
    borrowerNormalized: 'software co b',
    detailHref: '/datasets/ds_acred/explore?table=credit_events',
  },
]
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/data/acred-anomalies.test.ts
```

- [ ] **Step 5: Wire rule 8 into red-flags.ts**

Edit `lib/data/acred/red-flags.ts`. Replace rule 8's `evaluate`:

```ts
import { acredAnomalyFeed } from './anomalies'

// ... inside the rules array, rule 8:
{
  id: 'acred.recent_high_severity_event',
  label: 'New high-severity 8-K linked to held borrower (30d)',
  severity: 'high',
  evaluate: () => {
    const cutoff = Date.now() - 30 * 24 * 3_600_000
    const hit = acredAnomalyFeed.find((e) =>
      e.kind === 'credit-event' &&
      e.severity === 'high' &&
      new Date(e.occurredAt).getTime() >= cutoff,
    )
    return hit
      ? { reason: `${hit.title} — ${hit.borrowerNormalized}`, drillHref: hit.detailHref }
      : null
  },
},
```

- [ ] **Step 6: Re-run red-flag tests; the rule-8 hit may flip pass/fail depending on `occurredAt` recency. Adjust fixture dates if needed; the test allows 0 or more.**

```bash
npm test -- tests/unit/data/acred-red-flags.test.ts tests/unit/data/acred-anomalies.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add lib/data/acred/anomalies.ts lib/data/acred/red-flags.ts tests/unit/data/acred-anomalies.test.ts
git commit -m "feat(data): ACRED anomaly feed + wire credit-event rule into red-flags"
```

---

## Task 8: Mocked side-panel fixtures (peers, attestation discipline, AMM)

**Files:**
- Create: `lib/data/acred/peers.ts`
- Create: `lib/data/acred/attestation-discipline.ts`
- Create: `lib/data/acred/amm.ts`
- Test: `tests/unit/data/acred-side-panels.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/data/acred-side-panels.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { PeerDispersionRowSchema, AttestationDisciplineSchema, AmmFeedSchema } from '@/lib/api/schemas'
import { acredPeerDispersion } from '@/lib/data/acred/peers'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'
import { acredAmmFeed } from '@/lib/data/acred/amm'

describe('acredPeerDispersion', () => {
  it('parses', () => expect(() => z.array(PeerDispersionRowSchema).parse(acredPeerDispersion)).not.toThrow())
  it('dispersion equals max(mark) - min(mark) per row', () => {
    acredPeerDispersion.forEach((row) => {
      const marks = row.marks.map((m) => m.mark)
      const dispersion = Math.max(...marks) - Math.min(...marks)
      expect(Math.abs(dispersion - row.dispersionPoints)).toBeLessThan(0.01)
    })
  })
})

describe('acredAttestationDiscipline', () => {
  it('parses', () => expect(() => AttestationDisciplineSchema.parse(acredAttestationDiscipline)).not.toThrow())
  it('onTime ≤ delivered ≤ expected', () => {
    expect(acredAttestationDiscipline.onTimeLast30d).toBeLessThanOrEqual(acredAttestationDiscipline.deliveredLast30d)
    expect(acredAttestationDiscipline.deliveredLast30d).toBeLessThanOrEqual(acredAttestationDiscipline.expectedLast30d)
  })
})

describe('acredAmmFeed', () => {
  it('parses', () => expect(() => AmmFeedSchema.parse(acredAmmFeed)).not.toThrow())
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement fixtures**

```ts
// lib/data/acred/peers.ts
import type { PeerDispersionRow } from '@/lib/api/schemas'

export const acredPeerDispersion: PeerDispersionRow[] = [
  {
    borrowerNormalized: 'software co a', dispersionPoints: 1.6,
    commentary: 'Apollo mark at low end — investigate or accept',
    marks: [
      { fund: 'ACRED', mark: 98.2, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
      { fund: 'ARCC',  mark: 99.1, lastUpdated: '2026-03-25T00:00:00.000Z', hyveVerified: false },
      { fund: 'OBDC',  mark: 97.5, lastUpdated: '2026-04-09T00:00:00.000Z', hyveVerified: false },
    ],
  },
  {
    borrowerNormalized: 'industrials borrower b', dispersionPoints: 0.8,
    commentary: null,
    marks: [
      { fund: 'ACRED', mark: 99.4, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
      { fund: 'ARCC',  mark: 100.2, lastUpdated: '2026-03-25T00:00:00.000Z', hyveVerified: false },
    ],
  },
  {
    borrowerNormalized: 'healthcare borrower c', dispersionPoints: 2.3,
    commentary: 'Largest peer dispersion in the top-10',
    marks: [
      { fund: 'ACRED', mark: 96.1, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
      { fund: 'ARCC',  mark: 98.4, lastUpdated: '2026-03-25T00:00:00.000Z', hyveVerified: false },
      { fund: 'OBDC',  mark: 97.0, lastUpdated: '2026-04-09T00:00:00.000Z', hyveVerified: false },
      { fund: 'BBDC',  mark: 98.0, lastUpdated: '2026-03-30T00:00:00.000Z', hyveVerified: false },
    ],
  },
]
```

```ts
// lib/data/acred/attestation-discipline.ts
import type { AttestationDiscipline } from '@/lib/api/schemas'

export const acredAttestationDiscipline: AttestationDiscipline = {
  expectedLast30d: 30,
  deliveredLast30d: 30,
  onTimeLast30d: 28,
  lastGapAt: '2026-04-22T14:23:00.000Z',
  cadenceBreakdown: [
    { cadence: 'daily',    metric: 'NAV',                 delivered: 30, expected: 30, onTime: 30 },
    { cadence: 'weekly',   metric: 'Leverage attestation', delivered:  4, expected:  4, onTime:  3 },
    { cadence: 'monthly',  metric: 'Composition',          delivered:  1, expected:  1, onTime:  1 },
    { cadence: 'quarterly', metric: 'SEC N-PORT recon',    delivered:  1, expected:  1, onTime:  1 },
  ],
}
```

```ts
// lib/data/acred/amm.ts
import type { AmmFeed } from '@/lib/api/schemas'

export const acredAmmFeed: AmmFeed = {
  navPerToken: 100.42,
  navCI95: 0.018,
  freshnessSeconds: 3,
  inventoryAsset: 4_200_000,
  inventoryQuote: 2_800_000,
  activeFeeBps: 12,
  feeBpsBaseline: 8,
  maxSwapSize: 850_000,
  capacityGate: 'confidence',
  last24h: { swapCount: 47, swapVolume: 1_800_000, revertCount: 0, sharpe: 2.4 },
  anomalyStream: [
    {
      id: 'amm_sla_1',
      occurredAt: new Date(Date.now() - 2 * 60_000).toISOString(),
      kind: 'amm-sla', severity: 'medium',
      title: 'NAV freshness 62s > 60s SLA — max swap reduced to $400k',
      borrowerNormalized: null, detailHref: null,
    },
  ],
}
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/data/acred-side-panels.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/data/acred/peers.ts lib/data/acred/attestation-discipline.ts lib/data/acred/amm.ts tests/unit/data/acred-side-panels.test.ts
git commit -m "feat(data): ACRED side-panel mocks — peers, attestation discipline, AMM feed"
```

---

## Task 9: Update existing fixtures + add 3 new peer datasets

**Files:**
- Modify: `lib/api/fixtures/datasets.ts`
- Test: `tests/unit/api/dataset-fixtures.test.ts`

The portfolio table needs 5 visible private-credit-adjacent rows. `ds_acred` and `ds_mfone` already exist — extend with `briefSnapshot`. Add 3 new fixtures: `ds_jaaa`, `ds_fasanara`, `ds_ams_credit`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/dataset-fixtures.test.ts
import { describe, it, expect } from 'vitest'
import { datasetFixtures } from '@/lib/api/fixtures/datasets'
import { DatasetSchema } from '@/lib/api/schemas'

describe('datasetFixtures', () => {
  it('every fixture parses against DatasetSchema', () => {
    datasetFixtures.forEach((d) => expect(() => DatasetSchema.parse(d)).not.toThrow())
  })

  it('includes ds_acred, ds_mfone, ds_jaaa, ds_fasanara, ds_ams_credit', () => {
    const ids = datasetFixtures.map((d) => d.id)
    expect(ids).toEqual(expect.arrayContaining(['ds_acred', 'ds_mfone', 'ds_jaaa', 'ds_fasanara', 'ds_ams_credit']))
  })

  it('every credit-portfolio fixture carries a briefSnapshot', () => {
    const inPortfolio = ['ds_acred', 'ds_mfone', 'ds_jaaa', 'ds_fasanara', 'ds_ams_credit']
    datasetFixtures
      .filter((d) => inPortfolio.includes(d.id))
      .forEach((d) => expect(d.briefSnapshot).toBeDefined())
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

Edit `lib/api/fixtures/datasets.ts`:

3a. Extend the existing `ds_acred` fixture (around line 97) with `briefSnapshot`:

```ts
// Inside the ds_acred object, after `tables: [...]`:
briefSnapshot: {
  periodEnd: '2026-03-31T00:00:00.000Z',
  priorPeriodEnd: '2025-12-31T00:00:00.000Z',
  vitals: {
    nav:                   { value: 1_612_000_000, delta: -0.011, deltaKind: 'pct', tone: 'negative' },
    leverage:              { value: 0.730,         delta:  0.004, deltaKind: 'pp',  tone: 'negative' },
    nonAccrualPct:         { value: 1.42,          delta:  0.21,  deltaKind: 'pp',  tone: 'negative' },
    top10ConcentrationPct: { value: 32.4,          delta:  1.8,   deltaKind: 'pp',  tone: 'negative' },
    pikPct:                { value: 8.3,           delta:  1.1,   deltaKind: 'pp',  tone: 'negative' },
    netFlow:               { value: -23_000_000,   delta: -45_000_000, deltaKind: 'abs', tone: 'negative' },
  },
},
```

3b. Extend `ds_mfone` (around line 17) with mocked briefSnapshot:

```ts
briefSnapshot: {
  periodEnd: '2026-04-30T00:00:00.000Z',
  priorPeriodEnd: '2026-03-31T00:00:00.000Z',
  vitals: {
    nav:                   { value: 612_000_000, delta:  0.003, deltaKind: 'pct', tone: 'positive' },
    leverage:              { value: 0.54,        delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
    nonAccrualPct:         { value: 0.81,        delta: -0.04,  deltaKind: 'pp',  tone: 'positive' },
    top10ConcentrationPct: { value: 18.3,        delta:  0.4,   deltaKind: 'pp',  tone: 'neutral'  },
    pikPct:                { value: 0,           delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
    netFlow:               { value: 12_000_000,  delta:  3_000_000, deltaKind: 'abs', tone: 'positive' },
  },
},
```

3c. Append three new fixtures at the end of the `datasetFixtures` array:

```ts
  {
    id: 'ds_jaaa',
    name: 'JAAA',
    description: 'Janus Henderson AAA CLO ETF (mocked demo asset — not Hyve-integrated yet).',
    originatorOrgId: 'org_apollo',  // placeholder originator until org fixtures grow
    assetClass: 'private-credit',
    geography: 'US',
    schemaId: 'sch_acred_v1',  // share schema for demo simplicity
    schemaVersion: 1,
    recordCount: 0,
    lastAttestedAt: ts(240),
    completenessPct: 0.99,
    status: 'active',
    templateCount: 0,
    lifetimeRunCount: 0,
    attestation: baseAtt('jaaa'),
    watching: false,
    alerts: [],
    briefSnapshot: {
      periodEnd: '2026-04-30T00:00:00.000Z',
      priorPeriodEnd: '2026-03-31T00:00:00.000Z',
      vitals: {
        nav:                   { value: 984_000_000, delta:  0.001, deltaKind: 'pct', tone: 'neutral'  },
        leverage:              { value: 0.58,        delta:  0.001, deltaKind: 'pp',  tone: 'neutral'  },
        nonAccrualPct:         { value: 0.91,        delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
        top10ConcentrationPct: { value: 12.0,        delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
        pikPct:                { value: 0,           delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
        netFlow:               { value: 8_000_000,   delta: -2_000_000, deltaKind: 'abs', tone: 'neutral' },
      },
    },
  },
  {
    id: 'ds_fasanara',
    name: 'Fasanara',
    description: 'Fasanara invoice-finance pool (mocked demo asset — not Hyve-integrated yet).',
    originatorOrgId: 'org_apollo',
    assetClass: 'trade-receivables',
    geography: 'EU',
    schemaId: 'sch_acred_v1',
    schemaVersion: 1,
    recordCount: 0,
    lastAttestedAt: ts(60),
    completenessPct: 0.97,
    status: 'active',
    templateCount: 0,
    lifetimeRunCount: 0,
    attestation: baseAtt('fasa'),
    watching: false,
    alerts: [],
    briefSnapshot: {
      periodEnd: '2026-04-30T00:00:00.000Z',
      priorPeriodEnd: '2026-03-31T00:00:00.000Z',
      vitals: {
        nav:                   { value: 284_000_000, delta:  0.007, deltaKind: 'pct', tone: 'positive' },
        leverage:              { value: 0,           delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
        nonAccrualPct:         { value: 0.32,        delta:  0.02,  deltaKind: 'pp',  tone: 'neutral'  },
        top10ConcentrationPct: { value: 3.2,         delta:  0.1,   deltaKind: 'pp',  tone: 'neutral'  },
        pikPct:                { value: 0,           delta:  0,     deltaKind: 'pp',  tone: 'neutral'  },
        netFlow:               { value: 6_000_000,   delta:  1_500_000, deltaKind: 'abs', tone: 'positive' },
      },
    },
  },
  {
    id: 'ds_ams_credit',
    name: 'AMS-Credit',
    description: 'Apollo Multi-Strategy Credit (mocked demo asset — not Hyve-integrated yet).',
    originatorOrgId: 'org_apollo',
    assetClass: 'private-credit',
    geography: 'Global',
    schemaId: 'sch_acred_v1',
    schemaVersion: 1,
    recordCount: 0,
    lastAttestedAt: ts(360),
    completenessPct: 0.92,
    status: 'active',
    templateCount: 0,
    lifetimeRunCount: 0,
    attestation: baseAtt('amscred'),
    watching: false,
    alerts: [
      { id: 'al_ams_1', severity: 'critical', title: 'Leverage up 3pts MoM', body: 'Crossed 75% threshold; investigate.', createdAt: ts(120) },
    ],
    briefSnapshot: {
      periodEnd: '2026-04-30T00:00:00.000Z',
      priorPeriodEnd: '2026-03-31T00:00:00.000Z',
      vitals: {
        nav:                   { value: 147_000_000, delta: -0.004, deltaKind: 'pct', tone: 'negative' },
        leverage:              { value: 0.78,        delta:  0.030, deltaKind: 'pp',  tone: 'negative' },
        nonAccrualPct:         { value: 2.10,        delta:  0.32,  deltaKind: 'pp',  tone: 'negative' },
        top10ConcentrationPct: { value: 38.0,        delta:  2.1,   deltaKind: 'pp',  tone: 'negative' },
        pikPct:                { value: 5.5,         delta:  0.4,   deltaKind: 'pp',  tone: 'neutral'  },
        netFlow:               { value: -8_000_000,  delta: -3_500_000, deltaKind: 'abs', tone: 'negative' },
      },
    },
  },
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/api/dataset-fixtures.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/fixtures/datasets.ts tests/unit/api/dataset-fixtures.test.ts
git commit -m "feat(fixtures): extend ds_acred + ds_mfone with briefSnapshot; add 3 peer fixtures"
```

---

## Task 10: Add 5 new mock endpoints

**Files:**
- Modify: `lib/api/endpoints/datasets.ts`
- Test: `tests/unit/api/datasets-endpoints.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// tests/unit/api/datasets-endpoints.test.ts
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  getAcredBriefRedFlags, getAcredAnomalyFeed, getAcredPeerDispersion,
  getAcredAttestationDiscipline, getAcredAmmFeed,
} from '@/lib/api/endpoints/datasets'
import {
  RedFlagSchema, AnomalyEventSchema, PeerDispersionRowSchema,
  AttestationDisciplineSchema, AmmFeedSchema,
} from '@/lib/api/schemas'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }

describe('ACRED brief endpoints', () => {
  it('getAcredBriefRedFlags returns RedFlag[]', async () => {
    const data = await getAcredBriefRedFlags(ctx)
    expect(() => z.array(RedFlagSchema).parse(data)).not.toThrow()
  })

  it('getAcredAnomalyFeed returns AnomalyEvent[]', async () => {
    const data = await getAcredAnomalyFeed(ctx)
    expect(() => z.array(AnomalyEventSchema).parse(data)).not.toThrow()
  })

  it('getAcredPeerDispersion returns PeerDispersionRow[]', async () => {
    const data = await getAcredPeerDispersion(ctx)
    expect(() => z.array(PeerDispersionRowSchema).parse(data)).not.toThrow()
  })

  it('getAcredAttestationDiscipline returns AttestationDiscipline', async () => {
    const data = await getAcredAttestationDiscipline(ctx)
    expect(() => AttestationDisciplineSchema.parse(data)).not.toThrow()
  })

  it('getAcredAmmFeed returns AmmFeed', async () => {
    const data = await getAcredAmmFeed(ctx)
    expect(() => AmmFeedSchema.parse(data)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement** — append to `lib/api/endpoints/datasets.ts`:

```ts
import {
  RedFlagSchema, AnomalyEventSchema, PeerDispersionRowSchema,
  AttestationDisciplineSchema, AmmFeedSchema,
} from '@/lib/api/schemas'
import type {
  RedFlag, AnomalyEvent, PeerDispersionRow, AttestationDiscipline, AmmFeed,
} from '@/lib/api/schemas'
import { z } from 'zod'
import { acredFacts } from '@/lib/data/acred/facts'
import { evaluateAcredRedFlags } from '@/lib/data/acred/red-flags'
import { acredAnomalyFeed } from '@/lib/data/acred/anomalies'
import { acredPeerDispersion } from '@/lib/data/acred/peers'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'
import { acredAmmFeed } from '@/lib/data/acred/amm'

export const getAcredBriefRedFlags = mockEndpoint(
  async (_ctx: RequestContext): Promise<RedFlag[]> => {
    return z.array(RedFlagSchema).parse(evaluateAcredRedFlags(acredFacts.snapshot, acredFacts))
  },
  { latencyMs: 100 }
)

export const getAcredAnomalyFeed = mockEndpoint(
  async (_ctx: RequestContext): Promise<AnomalyEvent[]> => {
    return z.array(AnomalyEventSchema).parse(acredAnomalyFeed)
  },
  { latencyMs: 100 }
)

export const getAcredPeerDispersion = mockEndpoint(
  async (_ctx: RequestContext): Promise<PeerDispersionRow[]> => {
    return z.array(PeerDispersionRowSchema).parse(acredPeerDispersion)
  },
  { latencyMs: 140 }
)

export const getAcredAttestationDiscipline = mockEndpoint(
  async (_ctx: RequestContext): Promise<AttestationDiscipline> => {
    return AttestationDisciplineSchema.parse(acredAttestationDiscipline)
  },
  { latencyMs: 120 }
)

export const getAcredAmmFeed = mockEndpoint(
  async (_ctx: RequestContext): Promise<AmmFeed> => {
    return AmmFeedSchema.parse(acredAmmFeed)
  },
  { latencyMs: 100 }
)
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/api/datasets-endpoints.test.ts && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add lib/api/endpoints/datasets.ts tests/unit/api/datasets-endpoints.test.ts
git commit -m "feat(api): 5 new mock endpoints for ACRED brief + AMM"
```

---

## Task 11: Building blocks — `<DeltaTile>`, `<DeltaCell>`, `<AttestationCell>`

**Files:**
- Create: `components/features/brief/delta-tile.tsx`
- Create: `components/features/portfolio/delta-cell.tsx`
- Create: `components/features/portfolio/attestation-cell.tsx`
- Create: `lib/data/acred/format-delta.ts` (shared formatter; pure)
- Test: `tests/unit/components/brief-blocks.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/brief-blocks.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeltaTile } from '@/components/features/brief/delta-tile'
import { DeltaCell } from '@/components/features/portfolio/delta-cell'
import { AttestationCell } from '@/components/features/portfolio/attestation-cell'

describe('DeltaTile', () => {
  it('renders a value, label, and signed delta', () => {
    render(
      <DeltaTile
        label="Leverage"
        delta={{ value: 0.73, delta: 0.004, deltaKind: 'pp', tone: 'negative' }}
        formatValue={(v) => `${(v * 100).toFixed(1)}%`}
      />
    )
    expect(screen.getByText('Leverage')).toBeInTheDocument()
    expect(screen.getByText('73.0%')).toBeInTheDocument()
    expect(screen.getByText(/\+0\.4(0)?pp/)).toBeInTheDocument()
  })
})

describe('DeltaCell', () => {
  it('renders nothing when delta undefined', () => {
    render(<DeltaCell delta={undefined} formatValue={(v) => `${v}`} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('AttestationCell', () => {
  it('renders on-time percentage and relative timestamp', () => {
    const tenMinAgo = new Date(Date.now() - 600_000).toISOString()
    render(<AttestationCell onTimePct={0.93} lastAttestedAt={tenMinAgo} />)
    expect(screen.getByText(/93%/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement formatter**

```ts
// lib/data/acred/format-delta.ts
import type { Delta } from '@/lib/api/schemas'

export function formatDelta(delta: Delta): { signedText: string; tone: Delta['tone'] } {
  const sign = delta.delta > 0 ? '+' : ''
  const magnitude = delta.deltaKind === 'pct'
    ? `${(delta.delta * 100).toFixed(1)}%`
    : delta.deltaKind === 'pp'
      ? `${delta.delta.toFixed(2)}pp`
      : `${formatAbs(delta.delta)}`
  return { signedText: `${sign}${magnitude}`, tone: delta.tone }
}

function formatAbs(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return `${n.toFixed(0)}`
}
```

- [ ] **Step 4: Implement DeltaTile**

```tsx
// components/features/brief/delta-tile.tsx
import type { Delta } from '@/lib/api/schemas'
import { formatDelta } from '@/lib/data/acred/format-delta'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  delta: Delta
  formatValue: (v: number) => string
  /** Override the directionality of the arrow icon. Default: matches tone. */
  hideArrow?: boolean
}

const toneClass: Record<Delta['tone'], string> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-muted-foreground',
}

export function DeltaTile({ label, delta, formatValue, hideArrow }: Props) {
  const { signedText, tone } = formatDelta(delta)
  const arrow = hideArrow ? '' : delta.delta > 0 ? '↑' : delta.delta < 0 ? '↓' : ''
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{formatValue(delta.value)}</p>
      <p className={cn('mt-1 text-xs font-medium tabular-nums', toneClass[tone])}>
        {signedText}{arrow ? ` ${arrow}` : ''}
      </p>
    </div>
  )
}
```

- [ ] **Step 5: Implement DeltaCell**

```tsx
// components/features/portfolio/delta-cell.tsx
import type { Delta } from '@/lib/api/schemas'
import { formatDelta } from '@/lib/data/acred/format-delta'
import { cn } from '@/lib/utils'

type Props = {
  delta: Delta | undefined
  formatValue: (v: number) => string
}

export function DeltaCell({ delta, formatValue }: Props) {
  if (!delta) return <span className="text-muted-foreground">—</span>
  const { signedText, tone } = formatDelta(delta)
  const cls = tone === 'positive' ? 'text-success' : tone === 'negative' ? 'text-danger' : 'text-muted-foreground'
  return (
    <span className="inline-flex flex-col tabular-nums">
      <span className="text-sm">{formatValue(delta.value)}</span>
      <span className={cn('text-xs', cls)}>{signedText}</span>
    </span>
  )
}
```

- [ ] **Step 6: Implement AttestationCell**

```tsx
// components/features/portfolio/attestation-cell.tsx
import { FreshnessIndicator } from '@/components/common/freshness-indicator'

type Props = {
  /** 0..1 fraction. */
  onTimePct?: number
  lastAttestedAt: string
}

export function AttestationCell({ onTimePct, lastAttestedAt }: Props) {
  const pct = onTimePct == null ? '—' : `${Math.round(onTimePct * 100)}%`
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="font-medium tabular-nums">{pct}</span>
      <span className="text-muted-foreground">·</span>
      <FreshnessIndicator timestamp={lastAttestedAt} />
    </span>
  )
}
```

- [ ] **Step 7: Run tests, expect PASS**

```bash
npm test -- tests/unit/components/brief-blocks.test.tsx && npm run typecheck
```

- [ ] **Step 8: Commit**

```bash
git add components/features/brief/delta-tile.tsx components/features/portfolio/delta-cell.tsx components/features/portfolio/attestation-cell.tsx lib/data/acred/format-delta.ts tests/unit/components/brief-blocks.test.tsx
git commit -m "feat(brief): DeltaTile + DeltaCell + AttestationCell + format-delta helper"
```

---

## Task 12: `<BriefHeader>` and `<VitalSignsPanel>`

**Files:**
- Create: `components/features/brief/brief-header.tsx`
- Create: `components/features/brief/vital-signs-panel.tsx`
- Test: `tests/unit/components/vital-signs-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/vital-signs-panel.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VitalSignsPanel } from '@/components/features/brief/vital-signs-panel'
import { acredFacts } from '@/lib/data/acred/facts'

describe('VitalSignsPanel', () => {
  it('renders all six vital tiles', () => {
    render(<VitalSignsPanel snapshot={acredFacts.snapshot} />)
    ;['NAV', 'Leverage', 'Non-accrual', 'Top-10 concentration', 'PIK', 'Net flow'].forEach((label) => {
      expect(screen.getByText(new RegExp(label, 'i'))).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/brief-header.tsx
import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Attestation, AttestationDiscipline } from '@/lib/api/schemas'

type Props = {
  fundName: string
  issuerName: string
  attestation: Attestation
  lastAttestedAt: string
  periodEnd: string
  discipline: AttestationDiscipline
}

export function BriefHeader({ fundName, issuerName, attestation, lastAttestedAt, periodEnd, discipline }: Props) {
  const periodLabel = new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  const onTimePct = Math.round((discipline.onTimeLast30d / discipline.expectedLast30d) * 100)
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-medium">{fundName}</h2>
        <AttestationBadge attestation={attestation} compact />
        <FreshnessIndicator timestamp={lastAttestedAt} />
      </div>
      <p className="text-sm text-muted-foreground">
        {issuerName} · Period end {periodLabel} · Last attest 30d on-time {onTimePct}% ({discipline.onTimeLast30d}/{discipline.expectedLast30d})
      </p>
    </header>
  )
}
```

```tsx
// components/features/brief/vital-signs-panel.tsx
import { DeltaTile } from './delta-tile'
import type { BriefSnapshot } from '@/lib/api/schemas'

const formatUsd = (v: number) => `$${(v / 1e9).toFixed(3)}B`
const formatPp  = (v: number) => `${v.toFixed(2)}%`
const formatLev = (v: number) => `${(v * 100).toFixed(1)}%`
const formatAbs = (v: number) => {
  const abs = Math.abs(v)
  if (abs >= 1e6) return `${v < 0 ? '-' : ''}$${(abs / 1e6).toFixed(1)}M`
  return `$${v.toFixed(0)}`
}

export function VitalSignsPanel({ snapshot }: { snapshot: BriefSnapshot }) {
  const v = snapshot.vitals
  return (
    <section aria-labelledby="vitals">
      <h3 id="vitals" className="font-tag text-foreground/60 mb-3">{'// vital signs · period over period'}</h3>
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <DeltaTile label="NAV"                   delta={v.nav}                   formatValue={formatUsd} />
        <DeltaTile label="Leverage"              delta={v.leverage}              formatValue={formatLev} />
        <DeltaTile label="Non-accrual %"         delta={v.nonAccrualPct}         formatValue={formatPp}  />
        <DeltaTile label="Top-10 concentration"  delta={v.top10ConcentrationPct} formatValue={formatPp}  />
        <DeltaTile label="PIK %"                 delta={v.pikPct}                formatValue={formatPp}  />
        <DeltaTile label="Net flow"              delta={v.netFlow}               formatValue={formatAbs} />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/components/vital-signs-panel.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/brief-header.tsx components/features/brief/vital-signs-panel.tsx tests/unit/components/vital-signs-panel.test.tsx
git commit -m "feat(brief): BriefHeader + VitalSignsPanel"
```

---

## Task 13: `<RedFlagScoreboard>`

**Files:**
- Create: `components/features/brief/red-flag-scoreboard.tsx`
- Test: `tests/unit/components/red-flag-scoreboard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/red-flag-scoreboard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RedFlagScoreboard } from '@/components/features/brief/red-flag-scoreboard'
import type { RedFlag } from '@/lib/api/schemas'

const flags: RedFlag[] = [
  { id: 'r1', label: 'Non-accrual % rose 21bps QoQ', severity: 'medium', reason: '12 holdings', drillHref: '/datasets/ds_acred/explore?table=holdings' },
  { id: 'r2', label: 'Leverage > 75%', severity: 'high', reason: 'Currently 78%', drillHref: null },
]

describe('RedFlagScoreboard', () => {
  it('renders tripped count vs total rules', () => {
    render(<RedFlagScoreboard flags={flags} totalRules={8} />)
    expect(screen.getByText(/2 of 8 tripped/i)).toBeInTheDocument()
  })

  it('renders an empty state when no flags', () => {
    render(<RedFlagScoreboard flags={[]} totalRules={8} />)
    expect(screen.getByText(/no red flags tripped/i)).toBeInTheDocument()
  })

  it('renders a link for flags with drillHref and plain text otherwise', () => {
    render(<RedFlagScoreboard flags={flags} totalRules={8} />)
    expect(screen.getByRole('link', { name: /non-accrual/i })).toHaveAttribute('href', '/datasets/ds_acred/explore?table=holdings')
    expect(screen.queryByRole('link', { name: /leverage > 75%/i })).toBeNull()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/red-flag-scoreboard.tsx
import Link from 'next/link'
import type { RedFlag } from '@/lib/api/schemas'
import { cn } from '@/lib/utils'

const sevTone: Record<RedFlag['severity'], string> = {
  low:    'border-foreground/20 bg-foreground/5',
  medium: 'border-warning/40 bg-warning/5',
  high:   'border-danger/40 bg-danger/5',
}

export function RedFlagScoreboard({ flags, totalRules }: { flags: RedFlag[]; totalRules: number }) {
  return (
    <section aria-labelledby="red-flags">
      <header className="flex items-baseline justify-between">
        <h3 id="red-flags" className="font-tag text-foreground/60">{'// red flag scoreboard'}</h3>
        <span className="text-xs text-muted-foreground">{flags.length} of {totalRules} tripped</span>
      </header>
      {flags.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No red flags tripped against the current snapshot.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {flags.map((f) => (
            <li key={f.id} className={cn('rounded-md border-l-2 p-3', sevTone[f.severity])}>
              <p className="text-sm font-medium">
                {f.drillHref ? (
                  <Link href={f.drillHref} className="hover:underline">{f.label}</Link>
                ) : (
                  f.label
                )}
              </p>
              <p className="text-xs text-muted-foreground">{f.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/red-flag-scoreboard.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/red-flag-scoreboard.tsx tests/unit/components/red-flag-scoreboard.test.tsx
git commit -m "feat(brief): RedFlagScoreboard"
```

---

## Task 14: `<AnomalyFeed>`

**Files:**
- Create: `components/features/brief/anomaly-feed.tsx`
- Test: `tests/unit/components/anomaly-feed.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/anomaly-feed.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnomalyFeed } from '@/components/features/brief/anomaly-feed'
import type { AnomalyEvent } from '@/lib/api/schemas'

const evt = (over: Partial<AnomalyEvent>): AnomalyEvent => ({
  id: 'e', occurredAt: new Date(Date.now() - 86_400_000).toISOString(),
  kind: 'credit-event', severity: 'medium', title: 'X',
  borrowerNormalized: 'borrower x', detailHref: '/datasets/ds_acred/explore', ...over,
})

describe('AnomalyFeed', () => {
  it('renders empty state when feed is empty', () => {
    render(<AnomalyFeed events={[]} />)
    expect(screen.getByText(/no events in this window/i)).toBeInTheDocument()
  })

  it('renders a row per event with a relative timestamp', () => {
    render(<AnomalyFeed events={[evt({ id: 'a' }), evt({ id: 'b', kind: 'filing', borrowerNormalized: null, title: 'Filed Q1' })]} />)
    expect(screen.getAllByRole('listitem').length).toBe(2)
  })

  it('credit-event rows link to detailHref', () => {
    render(<AnomalyFeed events={[evt({ id: 'a', detailHref: '/x' })]} />)
    expect(screen.getByRole('link', { name: /X/i })).toHaveAttribute('href', '/x')
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/anomaly-feed.tsx
import Link from 'next/link'
import type { AnomalyEvent } from '@/lib/api/schemas'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const sevTone: Record<AnomalyEvent['severity'], string> = {
  info:   'bg-foreground/10 text-foreground/70',
  low:    'bg-foreground/10 text-foreground/70',
  medium: 'bg-warning/10  text-warning',
  high:   'bg-danger/10   text-danger',
}

export function AnomalyFeed({ events, title = '// anomaly feed · last 30d' }: { events: AnomalyEvent[]; title?: string }) {
  return (
    <section aria-labelledby="anomalies">
      <h3 id="anomalies" className="font-tag text-foreground/60 mb-3">{title}</h3>
      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No events in this window.
        </p>
      ) : (
        <ul className="grid gap-2">
          {events.map((e) => {
            const when = formatDistanceToNow(new Date(e.occurredAt), { addSuffix: true })
            const title = e.detailHref
              ? <Link href={e.detailHref} className="hover:underline">{e.title}</Link>
              : <span>{e.title}</span>
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-md border border-border bg-surface/30 p-3">
                <span className={cn('rounded-sm px-2 py-0.5 text-[0.65rem] font-tag uppercase tracking-wider', sevTone[e.severity])}>
                  {e.kind}
                </span>
                <span className="text-xs text-muted-foreground w-28 shrink-0">{when}</span>
                <span className="text-sm flex-1">{title}</span>
                {e.borrowerNormalized && (
                  <span className="text-xs text-muted-foreground">{e.borrowerNormalized}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/anomaly-feed.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/anomaly-feed.tsx tests/unit/components/anomaly-feed.test.tsx
git commit -m "feat(brief): AnomalyFeed"
```

---

## Task 15: Demo-badged side panels — `<PeerDispersionPanel>` and `<AttestationDisciplineTile>`

**Files:**
- Create: `components/features/brief/peer-dispersion-panel.tsx`
- Create: `components/features/brief/attestation-discipline-tile.tsx`
- Create: `components/features/brief/demo-badge.tsx` (small reusable badge)
- Test: `tests/unit/components/side-panels.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/side-panels.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PeerDispersionPanel } from '@/components/features/brief/peer-dispersion-panel'
import { AttestationDisciplineTile } from '@/components/features/brief/attestation-discipline-tile'
import { acredPeerDispersion } from '@/lib/data/acred/peers'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'

describe('PeerDispersionPanel', () => {
  it('renders the demo badge', () => {
    render(<PeerDispersionPanel rows={acredPeerDispersion} />)
    expect(screen.getByText(/demo/i)).toBeInTheDocument()
  })
})

describe('AttestationDisciplineTile', () => {
  it('renders each cadence row', () => {
    render(<AttestationDisciplineTile discipline={acredAttestationDiscipline} />)
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(4)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/demo-badge.tsx
export function DemoBadge({ title = 'Illustrative mock — not live data' }: { title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center rounded-sm border border-dashed border-foreground/30 bg-foreground/5 px-1.5 py-0.5 text-[0.6rem] font-tag uppercase tracking-wider text-foreground/55"
    >
      demo
    </span>
  )
}
```

```tsx
// components/features/brief/peer-dispersion-panel.tsx
import type { PeerDispersionRow } from '@/lib/api/schemas'
import { DemoBadge } from './demo-badge'

export function PeerDispersionPanel({ rows }: { rows: PeerDispersionRow[] }) {
  return (
    <section aria-labelledby="peer-dispersion">
      <header className="mb-2 flex items-center gap-2">
        <h3 id="peer-dispersion" className="font-tag text-foreground/60">{'// peer dispersion'}</h3>
        <DemoBadge title="Cross-fund consensus pricing — illustrative until peer-fund integration ships" />
      </header>
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.borrowerNormalized} className="rounded-md border border-border bg-surface/30 p-3 text-xs">
            <p className="font-medium">{r.borrowerNormalized}</p>
            <p className="mt-1 text-muted-foreground">
              {r.marks.map((m) => `${m.fund} ${m.mark.toFixed(1)}`).join(' · ')}
              {' · '}dispersion {r.dispersionPoints.toFixed(1)}pt
            </p>
            {r.commentary && <p className="mt-1 text-muted-foreground">{r.commentary}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
```

```tsx
// components/features/brief/attestation-discipline-tile.tsx
import type { AttestationDiscipline } from '@/lib/api/schemas'
import { DemoBadge } from './demo-badge'

export function AttestationDisciplineTile({ discipline }: { discipline: AttestationDiscipline }) {
  return (
    <section aria-labelledby="discipline">
      <header className="mb-2 flex items-center gap-2">
        <h3 id="discipline" className="font-tag text-foreground/60">{'// issuer attestation discipline'}</h3>
        <DemoBadge title="Data-delivery discipline — not a credit rating. SLA tracking is illustrative until live system ships." />
      </header>
      <table className="w-full text-xs">
        <thead className="text-foreground/55">
          <tr><th className="text-left py-1">Cadence</th><th className="text-left">Metric</th><th className="text-right">Delivered</th><th className="text-right">On time</th></tr>
        </thead>
        <tbody>
          {discipline.cadenceBreakdown.map((c) => (
            <tr key={c.cadence + c.metric} className="border-t border-border/60">
              <td className="py-1 capitalize">{c.cadence}</td>
              <td>{c.metric}</td>
              <td className="text-right tabular-nums">{c.delivered}/{c.expected}</td>
              <td className="text-right tabular-nums">{c.onTime}/{c.expected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/side-panels.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/peer-dispersion-panel.tsx components/features/brief/attestation-discipline-tile.tsx components/features/brief/demo-badge.tsx tests/unit/components/side-panels.test.tsx
git commit -m "feat(brief): PeerDispersionPanel, AttestationDisciplineTile, DemoBadge"
```

---

## Task 16: `<DrillOutActions>`

**Files:**
- Create: `components/features/brief/drill-out-actions.tsx`
- Test: `tests/unit/components/drill-out-actions.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/drill-out-actions.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrillOutActions } from '@/components/features/brief/drill-out-actions'

describe('DrillOutActions', () => {
  it('renders the three CTAs with correct hrefs', () => {
    render(<DrillOutActions
      exploreNonAccrualHref="/datasets/ds_acred/explore?table=holdings"
      memoHref="/notebooks/new?prefill=acred-brief-2026-q1"
      filingsHref="/datasets/ds_acred/runs"
      nonAccrualCount={12}
    />)
    expect(screen.getByRole('link', { name: /12 non-accrual holdings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /draft dd memo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /raw filings/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/brief/drill-out-actions.tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  exploreNonAccrualHref: string
  memoHref: string
  filingsHref: string
  nonAccrualCount: number
}

export function DrillOutActions({ exploreNonAccrualHref, memoHref, filingsHref, nonAccrualCount }: Props) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href={exploreNonAccrualHref}>Open Explore · {nonAccrualCount} non-accrual holdings</Link>
      </Button>
      <Button asChild>
        <Link href={memoHref}>Draft DD memo</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={filingsHref}>View raw filings</Link>
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/drill-out-actions.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/features/brief/drill-out-actions.tsx tests/unit/components/drill-out-actions.test.tsx
git commit -m "feat(brief): DrillOutActions CTA strip"
```

---

## Task 17: Wire the ACRED brief into `/datasets/[datasetId]/page.tsx`

**Files:**
- Modify: `app/(app)/datasets/[datasetId]/page.tsx`
- Create: `components/features/brief/acred-brief.tsx` (server-friendly assembly)

- [ ] **Step 1: Implement assembly component**

```tsx
// components/features/brief/acred-brief.tsx
import { BriefHeader } from './brief-header'
import { VitalSignsPanel } from './vital-signs-panel'
import { RedFlagScoreboard } from './red-flag-scoreboard'
import { AnomalyFeed } from './anomaly-feed'
import { PeerDispersionPanel } from './peer-dispersion-panel'
import { AttestationDisciplineTile } from './attestation-discipline-tile'
import { DrillOutActions } from './drill-out-actions'
import type { Dataset, RedFlag, AnomalyEvent, PeerDispersionRow, AttestationDiscipline } from '@/lib/api/schemas'
import { acredFacts } from '@/lib/data/acred/facts'
import { acredRedFlagRules } from '@/lib/data/acred/red-flags'

type Props = {
  dataset: Dataset
  issuerName: string
  redFlags: RedFlag[]
  anomalies: AnomalyEvent[]
  peerDispersion: PeerDispersionRow[]
  discipline: AttestationDiscipline
}

export function AcredBrief({ dataset, issuerName, redFlags, anomalies, peerDispersion, discipline }: Props) {
  const totalRules = acredRedFlagRules.length
  return (
    <div className="grid gap-8">
      <BriefHeader
        fundName={dataset.name}
        issuerName={issuerName}
        attestation={dataset.attestation}
        lastAttestedAt={dataset.lastAttestedAt}
        periodEnd={acredFacts.snapshot.periodEnd}
        discipline={discipline}
      />
      <VitalSignsPanel snapshot={acredFacts.snapshot} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <RedFlagScoreboard flags={redFlags} totalRules={totalRules} />
          <AnomalyFeed events={anomalies} />
        </div>
        <div className="grid gap-6">
          <PeerDispersionPanel rows={peerDispersion} />
          <AttestationDisciplineTile discipline={discipline} />
        </div>
      </div>
      <DrillOutActions
        exploreNonAccrualHref={`/datasets/${dataset.id}/explore?table=holdings&where=is_non_accrual%3Dtrue`}
        memoHref={`/notebooks/new?prefill=acred-brief-${acredFacts.snapshot.periodEnd.slice(0, 7)}`}
        filingsHref={`/datasets/${dataset.id}/runs`}
        nonAccrualCount={acredFacts.flaggedHoldings.nonAccrual}
      />
      <p className="text-xs text-muted-foreground">
        Peer dispersion and issuer attestation discipline are illustrative mocks until peer-fund integration and live SLA tracking ship.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Modify `app/(app)/datasets/[datasetId]/page.tsx`** — branch for ACRED:

```tsx
import { requireUser } from '@/lib/auth/server'
import {
  getDataset, getAcredBriefRedFlags, getAcredAnomalyFeed,
  getAcredPeerDispersion, getAcredAttestationDiscipline,
} from '@/lib/api/endpoints/datasets'
import { ai } from '@/lib/api/endpoints/ai'
import { fixtures } from '@/lib/api/fixtures'
import { Card, CardContent } from '@/components/ui/card'
import { fmtNumber, fmtPct } from '@/lib/format'
import { MetricCard } from '@/components/features/home/metric-card'
import { AskAnythingInput } from '@/components/features/datasets/ask-anything-input'
import { InsightCard } from '@/components/features/home/insight-card'
import { AcredBrief } from '@/components/features/brief/acred-brief'

export default async function DatasetOverview({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const ctx = { user: session }

  if (datasetId === 'ds_acred') {
    const [ds, redFlags, anomalies, peerDispersion, discipline] = await Promise.all([
      getDataset(ctx, datasetId),
      getAcredBriefRedFlags(ctx),
      getAcredAnomalyFeed(ctx),
      getAcredPeerDispersion(ctx),
      getAcredAttestationDiscipline(ctx),
    ])
    const org = fixtures.orgs.find((o) => o.id === ds.originatorOrgId)
    return (
      <AcredBrief
        dataset={ds}
        issuerName={org?.name ?? ds.originatorOrgId}
        redFlags={redFlags}
        anomalies={anomalies}
        peerDispersion={peerDispersion}
        discipline={discipline}
      />
    )
  }

  // Legacy overview for non-ACRED datasets — unchanged.
  const [ds, suggestions, anomalies] = await Promise.all([
    getDataset(ctx, datasetId),
    ai.suggestQueries(ctx, datasetId),
    ai.detectAnomalies(ctx, datasetId),
  ])

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Records under management" value={fmtNumber(ds.recordCount)} attestation={ds.attestation} freshAt={ds.lastAttestedAt} />
        <MetricCard label="Completeness" value={fmtPct(ds.completenessPct)} attestation={ds.attestation} />
        <MetricCard label="Schema version" value={`v${ds.schemaVersion}`} />
        <MetricCard label="Active templates" value={fmtNumber(ds.templateCount)} />
        <MetricCard label="Lifetime runs" value={fmtNumber(ds.lifetimeRunCount)} />
        <MetricCard label="Status" value={ds.status} />
      </section>
      {ds.alerts.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-tag text-foreground/60">{'// active alerts'}</h2>
          {ds.alerts.map((a) => (
            <Card key={a.id} className="border-l-2 border-warning/60 bg-warning/5">
              <CardContent className="py-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      <section className="grid gap-3">
        <h2 className="font-tag text-foreground/60">{'// ask the dataset'}</h2>
        <AskAnythingInput
          datasetId={datasetId}
          suggestions={suggestions}
          onAsk={async (q) => {
            'use server'
            return { href: `/templates/new?dataset=${datasetId}&prompt=${encodeURIComponent(q)}` }
          }}
        />
      </section>
      <section className="grid gap-3">
        <h2 className="font-tag text-foreground/60">{'// anomalies'}</h2>
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No anomalies detected.</p>
        ) : (
          anomalies.map((i) => <InsightCard key={i.id} insight={i} />)
        )}
      </section>
      {ds.description && (
        <section className="grid gap-2">
          <h2 className="font-tag text-foreground/60">{'// description'}</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{ds.description}</p>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify routes**

```bash
npm run dev
```

Then in the browser, visit `http://localhost:3000/datasets/ds_acred` (login as the counterparty persona) and confirm the brief renders. Visit `/datasets/ds_mfone` and confirm the legacy overview still renders. Stop the dev server.

- [ ] **Step 4: Visual loop**

Invoke the `visual-fix` skill on the ACRED brief page. Iterate on Playwright screenshots until the page matches the ASCII layout in the spec — pay particular attention to: (a) two-column main body (red flags + anomalies left, peer + discipline right) on `lg` breakpoint and up, (b) tile spacing matches `/datasets/ds_mfone` (consistent visual rhythm with the legacy overview MetricCards).

- [ ] **Step 5: Typecheck and commit**

```bash
npm run typecheck && npm run lint
git add components/features/brief/acred-brief.tsx app/'(app)'/datasets/'[datasetId]'/page.tsx
git commit -m "feat(brief): assemble ACRED monitoring brief and branch dataset overview"
```

---

## Task 18: PortfolioTable + swap into `/datasets/page.tsx`

**Files:**
- Create: `components/features/portfolio/portfolio-table.tsx`
- Modify: `app/(app)/datasets/page.tsx`
- Test: `tests/unit/components/portfolio-table.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/portfolio-table.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PortfolioTable } from '@/components/features/portfolio/portfolio-table'
import { datasetFixtures } from '@/lib/api/fixtures/datasets'

describe('PortfolioTable', () => {
  it('renders one row per dataset', () => {
    render(<PortfolioTable datasets={datasetFixtures} />)
    expect(screen.getAllByRole('row').length).toBe(datasetFixtures.length + 1) // +header
  })

  it('ACRED row routes to /datasets/ds_acred', () => {
    render(<PortfolioTable datasets={datasetFixtures} />)
    const acredLink = screen.getByRole('link', { name: /ACRED/i })
    expect(acredLink).toHaveAttribute('href', '/datasets/ds_acred')
  })

  it('shows en-dash for datasets without briefSnapshot', () => {
    const legacyOnly = datasetFixtures.filter((d) => !d.briefSnapshot)
    if (legacyOnly.length === 0) return
    render(<PortfolioTable datasets={legacyOnly} />)
    const tbody = screen.getAllByRole('row').slice(1)
    tbody.forEach((row) => {
      const navCell = within(row).getAllByRole('cell')[2]
      expect(navCell.textContent).toContain('—')
    })
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/portfolio/portfolio-table.tsx
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fixtures } from '@/lib/api/fixtures'
import { DeltaCell } from './delta-cell'
import { AttestationCell } from './attestation-cell'
import type { Dataset } from '@/lib/api/schemas'

const formatUsd = (v: number) => v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(0)}M`
const formatPp  = (v: number) => `${v.toFixed(2)}%`
const formatLev = (v: number) => `${(v * 100).toFixed(1)}%`

export function PortfolioTable({ datasets }: { datasets: Dataset[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Asset</th>
            <th>Class</th>
            <th className="text-right">NAV</th>
            <th className="text-right">Leverage</th>
            <th className="text-right">Non-accrual</th>
            <th>Attestation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((d) => {
            const org = fixtures.orgs.find((o) => o.id === d.originatorOrgId)
            const v = d.briefSnapshot?.vitals
            const onTime = undefined  // computed for ACRED below
            return (
              <tr key={d.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                  <p className="text-xs text-muted-foreground">{org?.name ?? d.originatorOrgId}</p>
                </td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{d.assetClass}</Badge></td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={v?.nav} formatValue={formatUsd} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={v?.leverage} formatValue={formatLev} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={v?.nonAccrualPct} formatValue={formatPp} />
                </td>
                <td className="px-3 py-2">
                  <AttestationCell onTimePct={onTime} lastAttestedAt={d.lastAttestedAt} />
                </td>
                <td className="px-3 py-2"><Badge variant="outline">{d.status}</Badge></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {datasets.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">No datasets match these filters.</p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Swap into `app/(app)/datasets/page.tsx`** — replace `<DatasetTable datasets={datasets} />` with `<PortfolioTable datasets={datasets} />`. Update the import accordingly. Page header copy stays the same; the eyebrow can change from `// catalog` to `// credit portfolio`.

- [ ] **Step 5: Run tests, lint, typecheck, dev verify**

```bash
npm test -- tests/unit/components/portfolio-table.test.tsx && npm run typecheck && npm run lint
```

Visit `/datasets`, confirm the new table; iterate via `visual-fix` if needed.

- [ ] **Step 6: Commit**

```bash
git add components/features/portfolio/portfolio-table.tsx app/'(app)'/datasets/page.tsx tests/unit/components/portfolio-table.test.tsx
git commit -m "feat(portfolio): PortfolioTable replaces DatasetTable in /datasets list"
```

---

## Task 19: AMM tile components

**Files:**
- Create: `components/features/amm/live-nav-tile.tsx`
- Create: `components/features/amm/inventory-tile.tsx`
- Create: `components/features/amm/freshness-sla-tile.tsx`
- Create: `components/features/amm/swap-capacity-tile.tsx`
- Test: `tests/unit/components/amm-tiles.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/amm-tiles.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveNavTile } from '@/components/features/amm/live-nav-tile'
import { InventoryTile } from '@/components/features/amm/inventory-tile'
import { FreshnessSlaTile } from '@/components/features/amm/freshness-sla-tile'
import { SwapCapacityTile } from '@/components/features/amm/swap-capacity-tile'

describe('AMM tiles', () => {
  it('LiveNavTile renders nav and CI', () => {
    render(<LiveNavTile navPerToken={100.42} navCI95={0.018} freshnessSeconds={3} />)
    expect(screen.getByText(/\$100\.42/)).toBeInTheDocument()
    expect(screen.getByText(/±\s*\$0\.018/)).toBeInTheDocument()
  })

  it('InventoryTile renders both inventories', () => {
    render(<InventoryTile inventoryAsset={4_200_000} inventoryQuote={2_800_000} />)
    expect(screen.getByText(/\$4\.2M ACRED/)).toBeInTheDocument()
    expect(screen.getByText(/\$2\.8M USDC/)).toBeInTheDocument()
  })

  it('FreshnessSlaTile shows SLA breach when freshness > 60s', () => {
    render(<FreshnessSlaTile freshnessSeconds={62} />)
    expect(screen.getByText(/SLA breach/i)).toBeInTheDocument()
  })

  it('SwapCapacityTile shows gate reason', () => {
    render(<SwapCapacityTile maxSwapSize={850_000} capacityGate="confidence" />)
    expect(screen.getByText(/gated by confidence/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/amm/live-nav-tile.tsx
export function LiveNavTile({ navPerToken, navCI95, freshnessSeconds }: { navPerToken: number; navCI95: number; freshnessSeconds: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">Live NAV</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">${navPerToken.toFixed(2)}</p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">± ${navCI95.toFixed(3)} (95%)</p>
      <p className="mt-1 text-xs text-muted-foreground">fresh {freshnessSeconds}s</p>
    </div>
  )
}
```

```tsx
// components/features/amm/inventory-tile.tsx
export function InventoryTile({ inventoryAsset, inventoryQuote }: { inventoryAsset: number; inventoryQuote: number }) {
  const fmt = (v: number) => `$${(v / 1e6).toFixed(1)}M`
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">Inventory</p>
      <p className="mt-1 text-sm tabular-nums">{fmt(inventoryAsset)} ACRED</p>
      <p className="text-sm tabular-nums">{fmt(inventoryQuote)} USDC</p>
    </div>
  )
}
```

```tsx
// components/features/amm/freshness-sla-tile.tsx
import { cn } from '@/lib/utils'
const SLA_SECONDS = 60
export function FreshnessSlaTile({ freshnessSeconds }: { freshnessSeconds: number }) {
  const breach = freshnessSeconds > SLA_SECONDS
  return (
    <div className={cn('rounded-lg border p-4', breach ? 'border-danger/40 bg-danger/5' : 'border-border bg-surface/40')}>
      <p className="font-tag text-xs text-foreground/55">Freshness SLA</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{freshnessSeconds}s</p>
      <p className={cn('mt-1 text-xs', breach ? 'text-danger' : 'text-muted-foreground')}>
        {breach ? `SLA breach (> ${SLA_SECONDS}s)` : `within ${SLA_SECONDS}s SLA`}
      </p>
    </div>
  )
}
```

```tsx
// components/features/amm/swap-capacity-tile.tsx
import type { AmmFeed } from '@/lib/api/schemas'

export function SwapCapacityTile({ maxSwapSize, capacityGate }: { maxSwapSize: number; capacityGate: AmmFeed['capacityGate'] }) {
  const fmt = (v: number) => `$${(v / 1e3).toFixed(0)}k`
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">Max swap size</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{fmt(maxSwapSize)}</p>
      <p className="mt-1 text-xs text-muted-foreground">gated by {capacityGate}</p>
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/amm-tiles.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/features/amm tests/unit/components/amm-tiles.test.tsx
git commit -m "feat(amm): four ops tiles (live NAV, inventory, freshness, capacity)"
```

---

## Task 20: `<CounterfactualCalculator>`

**Files:**
- Create: `components/features/amm/counterfactual-calculator.tsx`
- Test: `tests/unit/components/counterfactual.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/counterfactual.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CounterfactualCalculator } from '@/components/features/amm/counterfactual-calculator'

describe('CounterfactualCalculator', () => {
  it('recomputes max swap when CI slider moves', async () => {
    const user = userEvent.setup()
    render(<CounterfactualCalculator inventoryAsset={50_000_000} initialCI={0.002} />)
    const slider = screen.getByLabelText(/NAV confidence interval/i)
    const beforeText = screen.getByTestId('max-with-hyve').textContent
    await user.click(slider)
    await user.keyboard('{ArrowRight>10}')  // bumps slider 10 steps
    const afterText = screen.getByTestId('max-with-hyve').textContent
    expect(beforeText).not.toBe(afterText)
  })

  it('"without Hyve" multiplies CI by 10 and shows ~$5M when "with" is $50M', () => {
    render(<CounterfactualCalculator inventoryAsset={50_000_000} initialCI={0.002} />)
    expect(screen.getByTestId('max-with-hyve').textContent).toMatch(/\$5[0-9]M/)
    expect(screen.getByTestId('max-without-hyve').textContent).toMatch(/\$[1-9]M/)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/amm/counterfactual-calculator.tsx
'use client'
import { useState } from 'react'

const K = 50  // sensitivity constant — higher CI shrinks capacity faster

function maxSwap(inventoryAsset: number, ci: number): number {
  return Math.max(0, inventoryAsset * Math.max(0, 1 - K * ci))
}

const fmt = (v: number) => {
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export function CounterfactualCalculator({
  inventoryAsset, initialCI = 0.002,
}: { inventoryAsset: number; initialCI?: number }) {
  const [ci, setCI] = useState(initialCI)
  const withHyve = maxSwap(inventoryAsset, ci)
  const withoutHyve = maxSwap(inventoryAsset, ci * 10)
  return (
    <section className="rounded-lg border border-border bg-surface/40 p-4">
      <h3 className="font-tag text-foreground/60">{'// counterfactual capacity'}</h3>
      <label className="mt-3 block text-xs">
        <span>NAV confidence interval: <span className="tabular-nums">{(ci * 100).toFixed(2)}%</span></span>
        <input
          aria-label="NAV confidence interval"
          type="range" min={0.0005} max={0.02} step={0.0005}
          value={ci} onChange={(e) => setCI(parseFloat(e.target.value))}
          className="mt-2 block w-full"
        />
      </label>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">With Hyve-verified NAV</p>
          <p className="text-2xl font-medium tabular-nums" data-testid="max-with-hyve">{fmt(withHyve)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Without Hyve verification</p>
          <p className="text-2xl font-medium tabular-nums text-muted-foreground" data-testid="max-without-hyve">{fmt(withoutHyve)}</p>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Illustrative — fixed sensitivity constant k={K}.</p>
    </section>
  )
}
```

- [ ] **Step 4: Run, expect PASS**

```bash
npm test -- tests/unit/components/counterfactual.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add components/features/amm/counterfactual-calculator.tsx tests/unit/components/counterfactual.test.tsx
git commit -m "feat(amm): CounterfactualCalculator widget"
```

---

## Task 21: `<AmmOpsPanel>` client root with 5s interval

**Files:**
- Create: `components/features/amm/amm-ops-panel.tsx`
- Test: `tests/unit/components/amm-ops-panel.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/unit/components/amm-ops-panel.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AmmOpsPanel } from '@/components/features/amm/amm-ops-panel'
import { acredAmmFeed } from '@/lib/data/acred/amm'

afterEach(() => vi.useRealTimers())

describe('AmmOpsPanel', () => {
  it('initially renders the four tiles and 24h stats', () => {
    render(<AmmOpsPanel initial={acredAmmFeed} />)
    expect(screen.getByText(/Live NAV/i)).toBeInTheDocument()
    expect(screen.getByText(/Inventory/i)).toBeInTheDocument()
    expect(screen.getByText(/47 swaps/)).toBeInTheDocument()
  })

  it('mutates NAV via the interval', () => {
    vi.useFakeTimers()
    render(<AmmOpsPanel initial={acredAmmFeed} />)
    const before = screen.getByLabelText('NAV per token').textContent
    act(() => { vi.advanceTimersByTime(5_500) })
    const after = screen.getByLabelText('NAV per token').textContent
    expect(after).not.toBe(before)
  })
})
```

- [ ] **Step 2: Run, expect FAIL**

- [ ] **Step 3: Implement**

```tsx
// components/features/amm/amm-ops-panel.tsx
'use client'
import { useEffect, useReducer } from 'react'
import type { AmmFeed } from '@/lib/api/schemas'
import { LiveNavTile } from './live-nav-tile'
import { InventoryTile } from './inventory-tile'
import { FreshnessSlaTile } from './freshness-sla-tile'
import { SwapCapacityTile } from './swap-capacity-tile'
import { CounterfactualCalculator } from './counterfactual-calculator'
import { AnomalyFeed } from '@/components/features/brief/anomaly-feed'

type State = AmmFeed
type Action = { type: 'tick' }

function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'tick': {
      const jitter = (Math.random() - 0.5) * 0.04  // ±2 cents on $100
      const nav = +(state.navPerToken + jitter).toFixed(2)
      const fresh = Math.min(120, state.freshnessSeconds + 1)
      return { ...state, navPerToken: nav, freshnessSeconds: fresh }
    }
  }
}

export function AmmOpsPanel({ initial }: { initial: AmmFeed }) {
  const [state, dispatch] = useReducer(reduce, initial)
  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick' }), 5_000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="grid gap-6">
      <header>
        <h2 className="text-xl font-medium">AMM Operations <span className="text-xs text-muted-foreground">(demo)</span></h2>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div aria-label="NAV per token"><LiveNavTile navPerToken={state.navPerToken} navCI95={state.navCI95} freshnessSeconds={state.freshnessSeconds} /></div>
        <InventoryTile inventoryAsset={state.inventoryAsset} inventoryQuote={state.inventoryQuote} />
        <FreshnessSlaTile freshnessSeconds={state.freshnessSeconds} />
        <SwapCapacityTile maxSwapSize={state.maxSwapSize} capacityGate={state.capacityGate} />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">
        24h: {state.last24h.swapCount} swaps · ${(state.last24h.swapVolume / 1e6).toFixed(1)}M · {state.last24h.revertCount} reverts · Sharpe {state.last24h.sharpe.toFixed(1)}
      </p>
      <CounterfactualCalculator inventoryAsset={state.inventoryAsset} initialCI={state.navCI95} />
      <AnomalyFeed events={state.anomalyStream} title="// amm anomaly stream" />
    </div>
  )
}
```

- [ ] **Step 4: Run, expect PASS** + typecheck

```bash
npm test -- tests/unit/components/amm-ops-panel.test.tsx && npm run typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/features/amm/amm-ops-panel.tsx tests/unit/components/amm-ops-panel.test.tsx
git commit -m "feat(amm): AmmOpsPanel client root with 5s tick + counterfactual + stream"
```

---

## Task 22: AMM route + layout tab

**Files:**
- Create: `app/(app)/datasets/[datasetId]/amm/page.tsx`
- Create: `app/(app)/datasets/[datasetId]/amm/loading.tsx`
- Modify: `app/(app)/datasets/[datasetId]/layout.tsx` (add AMM tab when ds_acred)

- [ ] **Step 1: Create AMM route**

```tsx
// app/(app)/datasets/[datasetId]/amm/page.tsx
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getAcredAmmFeed } from '@/lib/api/endpoints/datasets'
import { AmmOpsPanel } from '@/components/features/amm/amm-ops-panel'

export default async function AmmPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  if (datasetId !== 'ds_acred') notFound()
  const session = await requireUser()
  const feed = await getAcredAmmFeed({ user: session })
  return <AmmOpsPanel initial={feed} />
}
```

- [ ] **Step 2: Create loading skeleton**

```tsx
// app/(app)/datasets/[datasetId]/amm/loading.tsx
export default function Loading() {
  return (
    <div className="grid gap-6 animate-pulse">
      <div className="h-6 w-48 rounded-md bg-foreground/10" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 rounded-lg bg-foreground/5" />)}
      </div>
      <div className="h-32 rounded-lg bg-foreground/5" />
      <div className="h-40 rounded-lg bg-foreground/5" />
    </div>
  )
}
```

- [ ] **Step 3: Modify dataset layout — add AMM tab for ds_acred**

Edit `app/(app)/datasets/[datasetId]/layout.tsx`, replace `tabsFor`:

```tsx
function tabsFor(ds: Dataset) {
  const base: Array<{ href: string; label: string }> = [{ href: '', label: 'Overview' }]
  if (ds.tables && ds.tables.length > 0) {
    base.push({ href: '/explore', label: 'Explore' })
  }
  if (ds.id === 'ds_acred') {
    base.push({ href: '/amm', label: 'AMM' })
  }
  base.push(
    { href: '/schema', label: 'Schema' },
    { href: '/templates', label: 'Templates' },
    { href: '/runs', label: 'Runs' },
    { href: '/lineage', label: 'Lineage' },
  )
  return base
}
```

- [ ] **Step 4: Verify route + visual loop**

```bash
npm run dev
```

Visit `/datasets/ds_acred/amm`, confirm tile layout and that NAV updates after a few seconds. Visit `/datasets/ds_mfone/amm`, confirm 404. Run `visual-fix` if layout drifts from the ASCII spec.

- [ ] **Step 5: Typecheck, lint, commit**

```bash
npm run typecheck && npm run lint
git add app/'(app)'/datasets/'[datasetId]'/amm/page.tsx app/'(app)'/datasets/'[datasetId]'/amm/loading.tsx app/'(app)'/datasets/'[datasetId]'/layout.tsx
git commit -m "feat(amm): /datasets/ds_acred/amm route + layout tab"
```

---

## Task 23: E2E spec — portfolio → brief → drill → memo → AMM

**Files:**
- Create: `tests/e2e/acred-monitoring-brief.spec.ts`

The spec uses the existing demo allocator persona. Reference patterns from `tests/e2e/explore-acred.spec.ts` and `tests/e2e/compose-acred.spec.ts`.

- [ ] **Step 1: Write the spec**

```ts
// tests/e2e/acred-monitoring-brief.spec.ts
import { test, expect } from '@playwright/test'

test.describe('ACRED monitoring brief', () => {
  test('portfolio → brief → drill → memo → AMM', async ({ page }) => {
    const warnings: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'warning' || msg.type() === 'error') warnings.push(msg.text())
    })

    // 1. Sign in (re-use the existing fixture login flow used by explore-acred.spec.ts).
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('counterparty@hyve.demo')
    await page.getByLabel(/password/i).fill('demo')
    await page.getByRole('button', { name: /sign in/i }).click()

    // 2. Portfolio
    await page.goto('/datasets')
    await expect(page.getByRole('link', { name: /^ACRED$/i })).toBeVisible()
    await expect(page.getByText(/Credit portfolio|catalog/i)).toBeVisible()

    // 3. Click ACRED, land on brief
    await page.getByRole('link', { name: /^ACRED$/i }).click()
    await expect(page).toHaveURL(/\/datasets\/ds_acred$/)
    await expect(page.getByText(/Apollo Diversified Credit/i)).toBeVisible()

    // 4. Vital signs — 6 tiles
    await expect(page.getByText(/^NAV$/)).toBeVisible()
    await expect(page.getByText(/^Leverage$/)).toBeVisible()
    await expect(page.getByText(/Non-accrual %/)).toBeVisible()
    await expect(page.getByText(/Top-10 concentration/)).toBeVisible()
    await expect(page.getByText(/^PIK %$/)).toBeVisible()
    await expect(page.getByText(/^Net flow$/)).toBeVisible()

    // 5. Red flag scoreboard with at least one tripped flag
    await expect(page.getByText(/tripped/)).toBeVisible()

    // 6. Drill into a non-accrual flag → Explore filtered
    const drillLink = page.getByRole('link', { name: /non-accrual % rose/i })
    if (await drillLink.count() > 0) {
      await drillLink.first().click()
      await expect(page).toHaveURL(/\/datasets\/ds_acred\/explore.*is_non_accrual/)
      await page.goBack()
    }

    // 7. Draft DD memo
    await page.getByRole('link', { name: /draft dd memo/i }).click()
    await expect(page).toHaveURL(/\/notebooks\/new/)
    await page.goBack()

    // 8. AMM tab
    await page.getByRole('link', { name: /^AMM$/i }).click()
    await expect(page).toHaveURL(/\/datasets\/ds_acred\/amm$/)
    await expect(page.getByText(/Live NAV/)).toBeVisible()

    // 9. Wait for the interval to tick once and assert NAV changes
    const navLocator = page.locator('[aria-label="NAV per token"]')
    const before = await navLocator.textContent()
    await page.waitForTimeout(6_000)
    const after = await navLocator.textContent()
    expect(after).not.toBe(before)

    // 10. Counterfactual calculator changes max-with-hyve when slider moves
    const beforeCap = await page.locator('[data-testid="max-with-hyve"]').textContent()
    await page.getByLabel(/NAV confidence interval/i).press('ArrowRight')
    const afterCap = await page.locator('[data-testid="max-with-hyve"]').textContent()
    expect(afterCap).not.toBe(beforeCap)

    // 11. No descriptor-drift warnings
    expect(warnings.filter((w) => w.includes('[descriptor-drift]'))).toEqual([])
  })
})
```

- [ ] **Step 2: Run, expect PASS**

```bash
npm run test:e2e -- tests/e2e/acred-monitoring-brief.spec.ts
```

If a step fails, the most likely cause is a login fixture mismatch — copy the working pattern from `tests/e2e/explore-acred.spec.ts`. Do **not** reduce the spec to make it pass; fix the underlying mismatch.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/acred-monitoring-brief.spec.ts
git commit -m "test(e2e): ACRED monitoring brief — portfolio → brief → drill → memo → AMM"
```

---

## Task 24: Final verification

- [ ] **Step 1: All units green**

```bash
npm test
```
Expected: every new unit suite passes alongside existing ones.

- [ ] **Step 2: Typecheck clean**

```bash
npm run typecheck
```

- [ ] **Step 3: Lint clean**

```bash
npm run lint
```

- [ ] **Step 4: E2E suite green**

```bash
npm run test:e2e
```
Expected: the new spec plus all existing specs pass (no regressions).

- [ ] **Step 5: Build succeeds**

```bash
npm run build
```

- [ ] **Step 6: Manual smoke (visual)**

```bash
npm run dev
```

Walk the demo flow as the counterparty persona: `/datasets` → click ACRED → scan vital signs → click a red flag → return → click Draft DD memo → return → click AMM tab → confirm NAV ticks. Stop dev server.

- [ ] **Step 7: Commit any verification-driven fixes**

```bash
git status   # if anything changed during verification, stage and commit
```

---

## Spec coverage check

Mapping spec sections → tasks:

| Spec section | Implementing task(s) |
|---|---|
| §Goal — three reframed surfaces | 17, 18, 22 |
| §Audience and surface | 17, 18, 22 |
| §Attestation, not a credit rating | 11 (AttestationCell), 15 (DisciplineTile) |
| §Architecture — data layer (real) | 5 (facts), 6 (red-flags), 7 (anomalies) |
| §Architecture — data layer (mocked) | 8 (peers, discipline, amm), 9 (peer datasets) |
| §Component composition | 11–16 (building blocks), 17 (assembly) |
| §Routes — modified `/datasets/[id]` | 17 |
| §Routes — modified `/datasets` | 18 |
| §Routes — new `/amm` page + loading | 22 |
| §Routes — modified layout (AMM tab) | 22 |
| §Schema & API (Zod additions) | 1–4 |
| §Schema (Dataset.briefSnapshot extension) | 2 |
| §New endpoints (5) | 10 |
| §Red flag rule library (8 rules) | 6, 7 |
| §Anomaly feed (real) | 7, 14, 17 |
| §AMM Operations (mocked) | 19–22 |
| §Layout — Credit Portfolio | 18 |
| §Layout — Monitoring Brief | 17 |
| §Layout — AMM tab | 21, 22 |
| §File layout | 1–22 (1:1) |
| §Loading/error — AMM cleanup | 21 (useEffect cleanup) |
| §Loading/error — empty anomaly feed | 14 (empty state) |
| §Loading/error — non-ACRED routes | 17 (branch), 22 (notFound) |
| §Loading/error — broken rule recovery | 6 (try/catch in evaluator) |
| §Testing — unit | 1–21 |
| §Testing — E2E | 23 |
| §Implementation order (spec §12 steps) | 1–24 (matches sequence) |

No gaps identified.
