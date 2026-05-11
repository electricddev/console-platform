# Notebook Compose with ACRED Methodology Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/notebooks/[notebookId]/compose` editor that lets a user assemble a notebook from a curated methodology library of 12 ACRED-backed queries, with live result rendering (metric / comparison / time-series / breakdown / table) executed by the DuckDB-WASM engine; the viewer page then renders those cells live for read-only sharing.

**Architecture:** Compose is a client subtree mounted under a thin server page that auth-gates on the notebook author. Cells are persisted via the existing `updateNotebookCells` mock endpoint with two additive optional fields (`methodologyId`, `renderShape`). The DuckDB-WASM singleton from the Explore tab feature is reused — both compose and viewer execute methodology DSLs against the 5 ACRED parquet views.

**Tech Stack:** Next.js 16 App Router · React 19 · `@duckdb/duckdb-wasm` (already wired) · `@monaco-editor/react` (already a dep) · Recharts · TanStack Table · Zod · Vitest · Playwright.

**Spec:** `docs/superpowers/specs/2026-05-11-notebook-compose-methodology-design.md`

**Notes for the implementer:**

- This project uses **npm** (`package-lock.json`), not pnpm. Use `npm run dev`, `npm test`, `npm run test:e2e`.
- All files live under repo root (`app/`, `components/`, `lib/`) — there is no `src/` directory.
- The Explore tab feature is already on `main`. Re-use its `lib/data/` foundation as much as possible.
- DuckDB-WASM cold start is ~1–3s. Plan for that in loading states.
- Two notable DuckDB-WASM gotchas already discovered: (a) `WIDTH_BUCKET` traps at the upper bound — use the manual `LEAST(FLOOR(...), N-1)` formula; (b) `prepare()` is unstable across sequential queries on one connection — use direct `conn.query(sql)` with fresh connections per query. Both patterns are visible in `lib/data/use-column-profile.ts` if you need a reference.
- The CLAUDE.md `Stop` hook will block completion of UI tasks that don't include a Playwright screenshot verification. For UI tasks (10 onward) follow the `visual-fix` loop: screenshot → identify → fix → re-screenshot.
- Conventional Commits style.

---

## File Structure

**New files (foundation):**

- `lib/data/methodology.ts` — types (`Methodology`, `RenderShape`, `Axis`, `CellResult`)
- `lib/data/acred/methodology.ts` — the 12-entry catalog
- `lib/data/use-cell-query.ts` — DSL execution hook for a single cell

**New files (compose UI):**

- `components/features/compose/notebook-composer.tsx` — client root, reducer, save flow
- `components/features/compose/methodology-sidebar.tsx`
- `components/features/compose/compose-cell-list.tsx`
- `components/features/compose/compose-cell-shell.tsx`
- `components/features/compose/cell-markdown-editor.tsx`
- `components/features/compose/cell-query-editor.tsx`
- `components/features/compose/result-renderer.tsx`
- `components/features/compose/result-metric.tsx`
- `components/features/compose/result-comparison.tsx`
- `components/features/compose/result-time-series.tsx`
- `components/features/compose/result-breakdown.tsx`
- `components/features/compose/result-table.tsx`
- `components/features/compose/save-bar.tsx`
- `components/features/compose/composer-reducer.ts` — pure reducer for unit testing
- `components/features/notebooks/executable-query-cell.tsx` — viewer-side live-execute wrapper

**New route:**

- `app/(app)/notebooks/[notebookId]/compose/page.tsx`
- `app/(app)/notebooks/[notebookId]/compose/loading.tsx`

**Modified files:**

- `lib/api/schemas.ts` — additive fields on `NotebookCellSchema` query variant
- `app/(app)/notebooks/[notebookId]/page.tsx` — Edit button + executable cell dispatch

**Tests:**

- `tests/unit/data/methodology.test.ts`
- `tests/unit/compose/composer-reducer.test.ts`
- `tests/unit/compose/result-renderer.test.tsx`
- `tests/e2e/compose-acred.spec.ts`

---

## Task 1: Foundation types

**Files:**

- Create: `lib/data/methodology.ts`

- [ ] **Step 1: Write the types file**

Create `lib/data/methodology.ts`:

```ts
export type RenderShape =
  | 'metric'
  | 'comparison'
  | 'time-series'
  | 'breakdown'
  | 'table'

export type Axis = 'time' | 'segment' | 'snapshot'

export type Methodology = {
  id: string
  title: string
  description: string
  axis: Axis
  shape: RenderShape
  dsl: string
}

/** A single cell's executed result. Stored ephemerally in the composer; never persisted. */
export type CellResult = {
  columns: string[]
  rows: Record<string, unknown>[]
  runtimeMs: number
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/data/methodology.ts
git commit -m "feat(data): methodology and cell-result types"
```

---

## Task 2: Additive Zod fields on query cells

**Files:**

- Modify: `lib/api/schemas.ts:512` (the `kind: 'query'` variant of `NotebookCellSchema`)

- [ ] **Step 1: Add the fields**

In `lib/api/schemas.ts`, locate the query variant inside `NotebookCellSchema` (the line with `kind: z.literal('query'),`). Replace that single line with the expanded object:

```ts
  z.object({
    id: z.string(),
    kind: z.literal('query'),
    templateId: z.string().optional(),
    dsl: z.string(),
    parameters: z.record(z.unknown()).default({}),
    runId: z.string().optional(),
    methodologyId: z.string().optional(),
    renderShape: z.enum(['metric', 'comparison', 'time-series', 'breakdown', 'table']).optional(),
  }),
```

- [ ] **Step 2: Verify existing fixtures still parse**

Run:
```bash
npm run typecheck && npm test
```

Expected: PASS. All 144+ existing tests still pass; the `tests/unit/api/originator-schemas.test.ts` (or equivalent notebook schema test) confirms existing fixtures parse.

- [ ] **Step 3: Commit**

```bash
git add lib/api/schemas.ts
git commit -m "feat(schemas): add methodologyId and renderShape to query cells"
```

---

## Task 3: Discover ACRED schemas (one-off, reuse prior findings)

**Files:** None (research only)

This task captures the column information needed to write the methodology DSLs. **The ACRED descriptors at `lib/data/acred/tables.ts` already contain the exact column names per table.** Read that file to get the column inventory.

- [ ] **Step 1: Read the descriptors**

Read `lib/data/acred/tables.ts` end-to-end. For each of the 5 tables, note:
- The exact column ids
- Which columns are date types (DATE / TIMESTAMP) — they get wrapped in `epoch_ms()` automatically by `useTableQuery` but for direct `conn.query()` paths (which `use-cell-query` will use), you may receive `bigint` or native Arrow date types depending on the query

- [ ] **Step 2: Capture a scratch reference**

In a scratch buffer (not committed), write a one-line summary per table listing the columns you'll use in methodology DSLs. Example:

```
fund_overview: period_end_date(DATE), nav_usd, aum_usd, weighted_avg_coupon, leverage_ratio, ...
borrowers: borrower_normalized(VARCHAR), primary_industry, primary_geography, total_exposure_usd, ...
holdings: borrower_normalized, fair_value, par_value, coupon_rate, period_end_date, asset_category, geography, rating, maturity_date, ...
concentration_metrics: period_end_date, pct_us, pct_first_lien, hhi, top10_pct, ...
credit_events: accession_number, event_date, severity, item_codes, ...
```

This is just notes for you — no file change.

---

## Task 4: Methodology catalog (12 entries)

**Files:**

- Create: `lib/data/acred/methodology.ts`

- [ ] **Step 1: Write the catalog skeleton**

Create `lib/data/acred/methodology.ts`. Start with the structure; you'll hand-write each DSL using the column names from Task 3.

```ts
import type { Methodology } from '../methodology'

export const acredMethodology: Methodology[] = [
  // 1. NAV trend (time-series)
  {
    id: 'acred.nav_trend',
    title: 'NAV over time',
    description: 'Net asset value at each snapshot date.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(period_end_date, '%Y-%m-01') AS period, nav_usd AS value
          FROM fund_overview
          ORDER BY period_end_date`,
  },
  // 2. Weighted coupon current vs 12mo ago (comparison)
  {
    id: 'acred.weighted_coupon_now_vs_prior',
    title: 'Weighted-avg coupon: current vs 12mo ago',
    description: 'Compares the current weighted-average coupon to one year ago.',
    axis: 'time',
    shape: 'comparison',
    dsl: `WITH ranked AS (
            SELECT period_end_date, weighted_avg_coupon,
                   row_number() OVER (ORDER BY period_end_date DESC) AS rn
            FROM fund_overview
          )
          SELECT CASE WHEN rn = 1 THEN 'Current' ELSE '12mo ago' END AS label,
                 weighted_avg_coupon AS value
          FROM ranked
          WHERE rn = 1 OR rn = 13
          ORDER BY rn`,
  },
  // 3. Top-10 borrowers (breakdown)
  {
    id: 'acred.top10_borrowers',
    title: 'Top-10 borrower exposure',
    description: 'Top 10 obligors by fair value in the most recent snapshot.',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT borrower_normalized AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY borrower_normalized
          ORDER BY value DESC
          LIMIT 10`,
  },
  // 4. Sector mix (breakdown)
  {
    id: 'acred.sector_mix',
    title: 'Exposure by industry sector',
    description: 'Fair value share by primary industry in the most recent snapshot.',
    axis: 'segment',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT coalesce(industry, 'Unknown') AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY label
          ORDER BY value DESC
          LIMIT 10`,
  },
  // 5. Geo mix (breakdown)
  {
    id: 'acred.geo_mix',
    title: 'Exposure by geography',
    description: 'Fair value share by issuer geography in the most recent snapshot.',
    axis: 'segment',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT geography AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY label
          ORDER BY value DESC
          LIMIT 10`,
  },
  // 6. Rating mix (breakdown)
  {
    id: 'acred.rating_mix',
    title: 'Internal rating distribution',
    description: 'Fair value by internal credit rating in the most recent snapshot.',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings)
          SELECT coalesce(rating, 'NR') AS label, SUM(fair_value) AS value
          FROM holdings, latest
          WHERE period_end_date = latest.d
          GROUP BY label
          ORDER BY label`,
  },
  // 7. Maturity profile (breakdown)
  {
    id: 'acred.maturity_profile',
    title: 'Maturity buckets',
    description: 'Fair value bucketed by years to maturity from the latest snapshot.',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM holdings),
          bucketed AS (
            SELECT fair_value,
              CASE
                WHEN maturity_date IS NULL THEN 'No maturity'
                WHEN date_diff('year', latest.d, maturity_date) <= 1 THEN '0–1y'
                WHEN date_diff('year', latest.d, maturity_date) <= 3 THEN '1–3y'
                WHEN date_diff('year', latest.d, maturity_date) <= 5 THEN '3–5y'
                ELSE '5y+'
              END AS label
            FROM holdings, latest
            WHERE period_end_date = latest.d
          )
          SELECT label, SUM(fair_value) AS value
          FROM bucketed
          GROUP BY label
          ORDER BY label`,
  },
  // 8. Watchlist % over time (time-series)
  {
    id: 'acred.watchlist_pct_over_time',
    title: 'Watchlist % of book over time',
    description: 'Share of fair value with internal rating CCC or worse, by period.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(period_end_date, '%Y-%m-01') AS period,
                 100.0 * SUM(CASE WHEN rating IN ('CCC','CC','C','D') THEN fair_value ELSE 0 END)
                 / NULLIF(SUM(fair_value), 0) AS value
          FROM holdings
          GROUP BY period
          ORDER BY period`,
  },
  // 9. Event frequency by month (time-series)
  {
    id: 'acred.event_frequency_by_month',
    title: 'Credit event count by month',
    description: 'Number of credit events disclosed per month.',
    axis: 'time',
    shape: 'time-series',
    dsl: `SELECT strftime(date_trunc('month', event_date), '%Y-%m-01') AS period,
                 COUNT(*) AS value
          FROM credit_events
          GROUP BY period
          ORDER BY period`,
  },
  // 10. Event severity mix (breakdown)
  {
    id: 'acred.event_severity_mix',
    title: 'Credit event severity mix',
    description: 'Total credit events by severity (low / medium / high).',
    axis: 'snapshot',
    shape: 'breakdown',
    dsl: `SELECT severity AS label, COUNT(*) AS value
          FROM credit_events
          WHERE severity IS NOT NULL
          GROUP BY severity
          ORDER BY label`,
  },
  // 11. First-lien % (metric)
  {
    id: 'acred.first_lien_pct',
    title: 'First-lien % of book',
    description: 'Most recent snapshot percentage of first-lien positions by fair value.',
    axis: 'snapshot',
    shape: 'metric',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM concentration_metrics)
          SELECT pct_first_lien AS value
          FROM concentration_metrics, latest
          WHERE period_end_date = latest.d`,
  },
  // 12. Concentration HHI (metric)
  {
    id: 'acred.hhi_concentration',
    title: 'Concentration HHI (current)',
    description: 'Herfindahl–Hirschman index of borrower concentration at the most recent snapshot.',
    axis: 'snapshot',
    shape: 'metric',
    dsl: `WITH latest AS (SELECT MAX(period_end_date) AS d FROM concentration_metrics)
          SELECT hhi AS value
          FROM concentration_metrics, latest
          WHERE period_end_date = latest.d`,
  },
]
```

**Important:** the column names above (`weighted_avg_coupon`, `pct_first_lien`, `hhi`, `industry`, `rating`, etc.) are taken from the existing ACRED descriptors. If any column is named differently in the actual parquet (verify by reading `lib/data/acred/tables.ts`), update the SQL accordingly. The structural test in Task 5 validates that DSLs only reference known view names, NOT column names — column drift is caught in the E2E (Task 13).

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/data/acred/methodology.ts
git commit -m "feat(data): ACRED methodology library (12 entries)"
```

---

## Task 5: Methodology structure test

**Files:**

- Create: `tests/unit/data/methodology.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/data/methodology.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { acredMethodology } from '@/lib/data/acred/methodology'

const SHAPES = new Set(['metric', 'comparison', 'time-series', 'breakdown', 'table'])
const AXES = new Set(['time', 'segment', 'snapshot'])
const KNOWN_VIEWS = new Set(['fund_overview', 'borrowers', 'holdings', 'concentration_metrics', 'credit_events'])

describe('acredMethodology', () => {
  it('has at least 10 entries', () => {
    expect(acredMethodology.length).toBeGreaterThanOrEqual(10)
  })

  it('every entry has required fields with valid shapes and axes', () => {
    for (const m of acredMethodology) {
      expect(m.id, 'id required').toBeTruthy()
      expect(m.title, `title required for ${m.id}`).toBeTruthy()
      expect(m.description, `description required for ${m.id}`).toBeTruthy()
      expect(SHAPES.has(m.shape), `${m.id} invalid shape: ${m.shape}`).toBe(true)
      expect(AXES.has(m.axis), `${m.id} invalid axis: ${m.axis}`).toBe(true)
      expect(m.dsl, `${m.id} missing dsl`).toBeTruthy()
    }
  })

  it('every id is unique', () => {
    const ids = new Set<string>()
    for (const m of acredMethodology) {
      expect(ids.has(m.id), `duplicate id: ${m.id}`).toBe(false)
      ids.add(m.id)
    }
  })

  it('every DSL references only known ACRED views', () => {
    // Naive scan: lowercase the DSL, search for "from <name>" tokens.
    // We do NOT execute SQL here — full validation happens in the E2E spec.
    for (const m of acredMethodology) {
      const dsl = m.dsl.toLowerCase()
      const matches = [...dsl.matchAll(/\bfrom\s+([a-z_][a-z0-9_]*)/g)]
      const referenced = new Set(matches.map((mm) => mm[1]))
      // Allow CTE names (anything declared via `WITH name AS`).
      const cteNames = new Set([...dsl.matchAll(/\bwith\s+([a-z_][a-z0-9_]*)\s+as/g)].map((mm) => mm[1]))
      const commaCtes = new Set([...dsl.matchAll(/\)\s*,\s*([a-z_][a-z0-9_]*)\s+as/g)].map((mm) => mm[1]))
      for (const name of referenced) {
        if (KNOWN_VIEWS.has(name) || cteNames.has(name) || commaCtes.has(name)) continue
        throw new Error(`${m.id} references unknown table/view: ${name}`)
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it passes**

Run:
```bash
npm test -- methodology
```

Expected: 4 tests PASS. If a structure assertion fails, fix the catalog entry in Task 4's file.

- [ ] **Step 3: Commit**

```bash
git add tests/unit/data/methodology.test.ts
git commit -m "test(data): methodology catalog structure"
```

---

## Task 6: useCellQuery hook

**Files:**

- Create: `lib/data/use-cell-query.ts`

- [ ] **Step 1: Write the hook**

Create `lib/data/use-cell-query.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'
import { useDuckDB } from './use-duckdb'
import type { CellResult } from './methodology'

type CellQueryState =
  | { ready: false; result: null; error: null }
  | { ready: false; result: null; error: Error }
  | { ready: true; result: CellResult; error: null }

/**
 * Executes a single DSL string against the shared DuckDB instance.
 * Designed for one-shot execution: the result is cached by stringified `dsl`
 * so re-running the same query (e.g. on viewer re-mount) returns instantly.
 *
 * Uses direct `conn.query(sql)` — not prepared statements — because
 * DuckDB-WASM `prepare()` is unstable across sequential calls on one connection.
 */
export function useCellQuery(dsl: string | null): CellQueryState {
  const { db, ready } = useDuckDB()
  const [state, setState] = useState<CellQueryState>({ ready: false, result: null, error: null })

  useEffect(() => {
    if (!ready || !db || !dsl) return
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      const t0 = performance.now()
      try {
        const res = await conn.query(dsl)
        const columns = res.schema.fields.map((f) => f.name)
        const rows = res.toArray().map((r) => r.toJSON() as Record<string, unknown>)
        const runtimeMs = Math.round(performance.now() - t0)
        if (!cancelled) setState({ ready: true, result: { columns, rows, runtimeMs }, error: null })
      } catch (err: unknown) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, result: null, error })
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, ready, dsl])

  return state
}
```

- [ ] **Step 2: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/data/use-cell-query.ts
git commit -m "feat(data): useCellQuery hook for single-cell DSL execution"
```

---

## Task 7: Result renderer dispatcher and shape components

**Files:**

- Create: `components/features/compose/result-renderer.tsx`
- Create: `components/features/compose/result-metric.tsx`
- Create: `components/features/compose/result-comparison.tsx`
- Create: `components/features/compose/result-time-series.tsx`
- Create: `components/features/compose/result-breakdown.tsx`
- Create: `components/features/compose/result-table.tsx`
- Create: `tests/unit/compose/result-renderer.test.tsx`

- [ ] **Step 1: Write the dispatcher**

Create `components/features/compose/result-renderer.tsx`:

```tsx
'use client'

import type { CellResult, RenderShape } from '@/lib/data/methodology'
import { ResultMetric } from './result-metric'
import { ResultComparison } from './result-comparison'
import { ResultTimeSeries } from './result-time-series'
import { ResultBreakdown } from './result-breakdown'
import { ResultTable } from './result-table'

type Props = { result: CellResult; shape: RenderShape }

export function ResultRenderer({ result, shape }: Props) {
  if (result.rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No rows.</p>
  }
  switch (shape) {
    case 'metric':       return <ResultMetric result={result} />
    case 'comparison':   return <ResultComparison result={result} />
    case 'time-series':  return <ResultTimeSeries result={result} />
    case 'breakdown':    return <ResultBreakdown result={result} />
    case 'table':        return <ResultTable result={result} />
  }
}
```

- [ ] **Step 2: Write the failing tests**

Create `tests/unit/compose/result-renderer.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultRenderer } from '@/components/features/compose/result-renderer'
import type { CellResult } from '@/lib/data/methodology'

function r(columns: string[], rows: Record<string, unknown>[]): CellResult {
  return { columns, rows, runtimeMs: 0 }
}

describe('<ResultRenderer />', () => {
  it('renders empty state when no rows', () => {
    render(<ResultRenderer shape="metric" result={r(['value'], [])} />)
    expect(screen.getByText(/no rows/i)).toBeInTheDocument()
  })

  it('renders metric (single number)', () => {
    render(<ResultRenderer shape="metric" result={r(['value'], [{ value: 0.42 }])} />)
    // Some textual representation of 0.42 (or 42% if the renderer formats — be lenient)
    expect(screen.getByText(/0\.42|42/)).toBeInTheDocument()
  })

  it('renders comparison (two labeled bars)', () => {
    render(<ResultRenderer shape="comparison" result={r(['label', 'value'], [
      { label: 'Current', value: 7.8 },
      { label: '12mo ago', value: 6.4 },
    ])} />)
    expect(screen.getByText(/current/i)).toBeInTheDocument()
    expect(screen.getByText(/12mo ago/i)).toBeInTheDocument()
  })

  it('renders breakdown bars', () => {
    render(<ResultRenderer shape="breakdown" result={r(['label', 'value'], [
      { label: 'Tech', value: 100 },
      { label: 'Energy', value: 60 },
    ])} />)
    expect(screen.getByText(/tech/i)).toBeInTheDocument()
    expect(screen.getByText(/energy/i)).toBeInTheDocument()
  })

  it('renders time-series', () => {
    render(<ResultRenderer shape="time-series" result={r(['period', 'value'], [
      { period: '2024-01-01', value: 10 },
      { period: '2024-02-01', value: 12 },
    ])} />)
    // Recharts renders SVGs; assert the container has at least one path element.
    const container = document.querySelector('svg path')
    expect(container).toBeTruthy()
  })

  it('renders table for generic shape', () => {
    render(<ResultRenderer shape="table" result={r(['a', 'b'], [
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
    ])} />)
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(screen.getByText('y')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests to see them fail**

```bash
npm test -- result-renderer
```

Expected: FAIL (modules not found yet for the 5 shape components).

- [ ] **Step 4: Implement the 5 shape components**

Create `components/features/compose/result-metric.tsx`:

```tsx
'use client'

import type { CellResult } from '@/lib/data/methodology'
import { fmtNumber } from '@/lib/format'

export function ResultMetric({ result }: { result: CellResult }) {
  const row = result.rows[0] ?? {}
  const valueKey = result.columns[0]
  const priorKey = result.columns[1]
  const value = Number(row[valueKey])
  const prior = priorKey ? Number(row[priorKey]) : null
  const delta = prior !== null && Number.isFinite(prior) && Number.isFinite(value) ? value - prior : null
  const deltaTone = delta == null ? '' : delta >= 0 ? 'text-success' : 'text-destructive'

  return (
    <div className="grid gap-1">
      <div className="font-mono text-3xl tabular-nums">{fmtNumber(value, { decimals: 2 })}</div>
      {delta !== null && (
        <div className={`text-xs ${deltaTone}`}>
          {delta >= 0 ? '▲' : '▼'} {fmtNumber(Math.abs(delta), { decimals: 2 })}
        </div>
      )}
    </div>
  )
}
```

Create `components/features/compose/result-comparison.tsx`:

```tsx
'use client'

import type { CellResult } from '@/lib/data/methodology'
import { fmtNumber } from '@/lib/format'

export function ResultComparison({ result }: { result: CellResult }) {
  const labelKey = result.columns[0]
  const valueKey = result.columns[1]
  if (result.rows.length < 2 || !labelKey || !valueKey) {
    return <p className="text-xs text-muted-foreground">Comparison expects ≥2 rows with (label, value).</p>
  }
  const primary = result.rows[0]
  const comparand = result.rows[1]
  const pv = Number(primary[valueKey])
  const cv = Number(comparand[valueKey])
  const delta = Number.isFinite(pv) && Number.isFinite(cv) ? pv - cv : null
  const max = Math.max(Math.abs(pv), Math.abs(cv), 1)

  return (
    <div className="grid gap-2">
      {delta !== null && (
        <div className={`text-xs ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
          {delta >= 0 ? '▲' : '▼'} {fmtNumber(Math.abs(delta), { decimals: 2 })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {[primary, comparand].map((row, i) => {
          const v = Number(row[valueKey])
          const w = Math.max(2, Math.round((Math.abs(v) / max) * 100))
          return (
            <div key={i} className="grid gap-1">
              <div className="text-xs text-muted-foreground">{String(row[labelKey])}</div>
              <div className="font-mono text-lg tabular-nums">{fmtNumber(v, { decimals: 2 })}</div>
              <div className="h-1 rounded bg-accent">
                <div className="h-1 rounded bg-foreground/70" style={{ width: `${w}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

Create `components/features/compose/result-time-series.tsx`:

```tsx
'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { CellResult } from '@/lib/data/methodology'

export function ResultTimeSeries({ result }: { result: CellResult }) {
  const periodKey = result.columns[0]
  const valueKey = result.columns[1]
  const data = result.rows.map((r) => ({
    period: String(r[periodKey]),
    value: Number(r[valueKey]),
  }))
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <XAxis dataKey="period" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(0, 7)} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke="oklch(0.40 0.10 160)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Create `components/features/compose/result-breakdown.tsx`:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { CellResult } from '@/lib/data/methodology'

export function ResultBreakdown({ result }: { result: CellResult }) {
  const labelKey = result.columns[0]
  const valueKey = result.columns[1]
  const data = result.rows.slice(0, 10).map((r) => ({
    label: String(r[labelKey]),
    value: Number(r[valueKey]),
  }))
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={100} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="value" fill="oklch(0.40 0.10 160)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Create `components/features/compose/result-table.tsx`:

```tsx
'use client'

import type { CellResult } from '@/lib/data/methodology'

export function ResultTable({ result }: { result: CellResult }) {
  return (
    <div className="overflow-auto rounded-md border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-surface/80 text-muted-foreground">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-t border-border/40">
              {result.columns.map((c) => (
                <td key={c} className="px-2 py-1 font-mono text-xs tabular-nums">
                  {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 5: Run tests to see them pass**

```bash
npm test -- result-renderer
```

Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add components/features/compose/result-renderer.tsx \
        components/features/compose/result-metric.tsx \
        components/features/compose/result-comparison.tsx \
        components/features/compose/result-time-series.tsx \
        components/features/compose/result-breakdown.tsx \
        components/features/compose/result-table.tsx \
        tests/unit/compose/result-renderer.test.tsx
git commit -m "feat(compose): result renderer dispatch + 5 shape components"
```

---

## Task 8: Composer reducer with unit tests

**Files:**

- Create: `components/features/compose/composer-reducer.ts`
- Create: `tests/unit/compose/composer-reducer.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/compose/composer-reducer.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { composerReducer, initialComposerState } from '@/components/features/compose/composer-reducer'
import type { Methodology } from '@/lib/data/methodology'
import type { NotebookCell } from '@/lib/api/types'

const sampleMethodology: Methodology = {
  id: 'acred.nav_trend',
  title: 'NAV over time',
  description: 'NAV per period.',
  axis: 'time',
  shape: 'time-series',
  dsl: 'SELECT period_end_date AS period, nav_usd AS value FROM fund_overview',
}

describe('composerReducer', () => {
  const start: NotebookCell[] = [{ id: 'c1', kind: 'markdown', markdown: '# Title' }]

  it('add-methodology appends a query cell with methodology metadata', () => {
    const s = composerReducer(initialComposerState(start), { type: 'add-methodology', methodology: sampleMethodology })
    expect(s.cells.length).toBe(2)
    const last = s.cells[1]
    expect(last.kind).toBe('query')
    if (last.kind === 'query') {
      expect(last.methodologyId).toBe('acred.nav_trend')
      expect(last.renderShape).toBe('time-series')
      expect(last.dsl).toContain('SELECT')
    }
    expect(s.dirty).toBe(true)
  })

  it('add-markdown appends a markdown cell', () => {
    const s = composerReducer(initialComposerState(start), { type: 'add-markdown' })
    expect(s.cells.length).toBe(2)
    expect(s.cells[1].kind).toBe('markdown')
    expect(s.dirty).toBe(true)
  })

  it('add-blank-query appends an empty query cell with renderShape table', () => {
    const s = composerReducer(initialComposerState(start), { type: 'add-blank-query' })
    expect(s.cells.length).toBe(2)
    const last = s.cells[1]
    expect(last.kind).toBe('query')
    if (last.kind === 'query') {
      expect(last.renderShape).toBe('table')
      expect(last.methodologyId).toBeUndefined()
    }
    expect(s.dirty).toBe(true)
  })

  it('remove-cell drops the cell with that id', () => {
    const s = composerReducer(initialComposerState(start), { type: 'remove-cell', id: 'c1' })
    expect(s.cells.length).toBe(0)
    expect(s.dirty).toBe(true)
  })

  it('move-cell up swaps with previous; respects bounds', () => {
    const seed: NotebookCell[] = [
      { id: 'a', kind: 'markdown', markdown: 'A' },
      { id: 'b', kind: 'markdown', markdown: 'B' },
    ]
    const s = composerReducer(initialComposerState(seed), { type: 'move-cell', id: 'b', dir: 'up' })
    expect(s.cells.map((c) => c.id)).toEqual(['b', 'a'])

    const top = composerReducer(s, { type: 'move-cell', id: 'b', dir: 'up' })
    expect(top.cells.map((c) => c.id)).toEqual(['b', 'a']) // no-op at top
  })

  it('set-markdown updates the cell', () => {
    const s = composerReducer(initialComposerState(start), { type: 'set-markdown', id: 'c1', markdown: '# Edited' })
    expect(s.cells[0].kind === 'markdown' && s.cells[0].markdown).toBe('# Edited')
    expect(s.dirty).toBe(true)
  })

  it('set-dsl updates a query cell', () => {
    const withQuery = composerReducer(initialComposerState(start), { type: 'add-blank-query' })
    const queryId = withQuery.cells[1].id
    const s = composerReducer(withQuery, { type: 'set-dsl', id: queryId, dsl: 'SELECT 1' })
    const c = s.cells.find((x) => x.id === queryId)
    expect(c?.kind === 'query' && c.dsl).toBe('SELECT 1')
  })

  it('start-run/finish-run/fail-run track running and results', () => {
    const withQuery = composerReducer(initialComposerState(start), { type: 'add-blank-query' })
    const id = withQuery.cells[1].id

    const running = composerReducer(withQuery, { type: 'start-run', id })
    expect(running.running.has(id)).toBe(true)

    const finished = composerReducer(running, {
      type: 'finish-run', id, result: { columns: ['v'], rows: [{ v: 1 }], runtimeMs: 5 },
    })
    expect(finished.running.has(id)).toBe(false)
    expect(finished.results[id]).toBeDefined()

    const failed = composerReducer(running, { type: 'fail-run', id, error: 'boom' })
    expect(failed.running.has(id)).toBe(false)
    expect(failed.errors[id]).toBe('boom')
  })

  it('reset-from clears dirty and replaces cells', () => {
    const after = composerReducer(initialComposerState(start), { type: 'add-markdown' })
    expect(after.dirty).toBe(true)
    const reset = composerReducer(after, { type: 'reset-from', cells: start })
    expect(reset.dirty).toBe(false)
    expect(reset.cells).toEqual(start)
  })
})
```

- [ ] **Step 2: Run tests to see them fail**

```bash
npm test -- composer-reducer
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement the reducer**

Create `components/features/compose/composer-reducer.ts`:

```ts
import type { Methodology, CellResult } from '@/lib/data/methodology'
import type { NotebookCell } from '@/lib/api/types'

export type ComposerState = {
  cells: NotebookCell[]
  dirty: boolean
  running: Set<string>
  results: Record<string, CellResult | undefined>
  errors: Record<string, string | undefined>
}

export type ComposerAction =
  | { type: 'add-methodology'; methodology: Methodology }
  | { type: 'add-markdown' }
  | { type: 'add-blank-query' }
  | { type: 'remove-cell'; id: string }
  | { type: 'move-cell'; id: string; dir: 'up' | 'down' }
  | { type: 'set-markdown'; id: string; markdown: string }
  | { type: 'set-dsl'; id: string; dsl: string }
  | { type: 'start-run'; id: string }
  | { type: 'finish-run'; id: string; result: CellResult }
  | { type: 'fail-run'; id: string; error: string }
  | { type: 'reset-from'; cells: NotebookCell[] }

export function initialComposerState(cells: NotebookCell[]): ComposerState {
  return { cells, dirty: false, running: new Set(), results: {}, errors: {} }
}

let cellCounter = 0
function newCellId(): string {
  cellCounter += 1
  return `c_${Date.now().toString(36)}_${cellCounter}`
}

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'add-methodology': {
      const m = action.methodology
      const cell: NotebookCell = {
        id: newCellId(),
        kind: 'query',
        dsl: m.dsl,
        parameters: {},
        methodologyId: m.id,
        renderShape: m.shape,
      }
      return { ...state, cells: [...state.cells, cell], dirty: true }
    }
    case 'add-markdown': {
      const cell: NotebookCell = { id: newCellId(), kind: 'markdown', markdown: '' }
      return { ...state, cells: [...state.cells, cell], dirty: true }
    }
    case 'add-blank-query': {
      const cell: NotebookCell = {
        id: newCellId(),
        kind: 'query',
        dsl: '',
        parameters: {},
        renderShape: 'table',
      }
      return { ...state, cells: [...state.cells, cell], dirty: true }
    }
    case 'remove-cell':
      return { ...state, cells: state.cells.filter((c) => c.id !== action.id), dirty: true }
    case 'move-cell': {
      const idx = state.cells.findIndex((c) => c.id === action.id)
      if (idx < 0) return state
      const target = action.dir === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= state.cells.length) return state
      const next = state.cells.slice()
      const [moved] = next.splice(idx, 1)
      next.splice(target, 0, moved)
      return { ...state, cells: next, dirty: true }
    }
    case 'set-markdown':
      return {
        ...state,
        cells: state.cells.map((c) =>
          c.id === action.id && c.kind === 'markdown' ? { ...c, markdown: action.markdown } : c,
        ),
        dirty: true,
      }
    case 'set-dsl':
      return {
        ...state,
        cells: state.cells.map((c) =>
          c.id === action.id && c.kind === 'query' ? { ...c, dsl: action.dsl } : c,
        ),
        dirty: true,
      }
    case 'start-run': {
      const running = new Set(state.running)
      running.add(action.id)
      const errors = { ...state.errors }
      delete errors[action.id]
      return { ...state, running, errors }
    }
    case 'finish-run': {
      const running = new Set(state.running)
      running.delete(action.id)
      return { ...state, running, results: { ...state.results, [action.id]: action.result } }
    }
    case 'fail-run': {
      const running = new Set(state.running)
      running.delete(action.id)
      return { ...state, running, errors: { ...state.errors, [action.id]: action.error } }
    }
    case 'reset-from':
      return { cells: action.cells, dirty: false, running: new Set(), results: {}, errors: {} }
  }
}
```

- [ ] **Step 4: Run tests to see them pass**

```bash
npm test -- composer-reducer
```

Expected: 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/features/compose/composer-reducer.ts tests/unit/compose/composer-reducer.test.ts
git commit -m "feat(compose): composer reducer with full unit coverage"
```

---

## Task 9: Methodology sidebar + cell shell + compose cell list

**Files:**

- Create: `components/features/compose/methodology-sidebar.tsx`
- Create: `components/features/compose/compose-cell-shell.tsx`
- Create: `components/features/compose/compose-cell-list.tsx`

- [ ] **Step 1: Sidebar**

Create `components/features/compose/methodology-sidebar.tsx`:

```tsx
'use client'

import type { Axis, Methodology } from '@/lib/data/methodology'
import { acredMethodology } from '@/lib/data/acred/methodology'
import { Button } from '@/components/ui/button'

const AXIS_ORDER: { id: Axis; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'segment', label: 'Segment' },
  { id: 'snapshot', label: 'Snapshot' },
]

type Props = {
  onAddMethodology: (m: Methodology) => void
  onAddMarkdown: () => void
  onAddBlankQuery: () => void
}

export function MethodologySidebar({ onAddMethodology, onAddMarkdown, onAddBlankQuery }: Props) {
  return (
    <aside className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
      <div className="grid gap-3">
        <div className="grid gap-1">
          <div className="font-tag text-foreground/60">{'// methodology'}</div>
          {AXIS_ORDER.map((axis) => {
            const entries = acredMethodology.filter((m) => m.axis === axis.id)
            if (entries.length === 0) return null
            return (
              <div key={axis.id} className="grid gap-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{axis.label}</div>
                {entries.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onAddMethodology(m)}
                    title={m.description}
                    className="w-full rounded px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <div className="text-sm">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.shape}</div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
        <div className="grid gap-1 border-t border-border pt-3">
          <div className="font-tag text-foreground/60">{'// custom'}</div>
          <Button size="sm" variant="outline" onClick={onAddMarkdown}>Add markdown</Button>
          <Button size="sm" variant="outline" onClick={onAddBlankQuery}>Add custom query</Button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Cell shell**

Create `components/features/compose/compose-cell-shell.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'

type Props = {
  title: string
  subtitle?: string
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  children: React.ReactNode
}

export function ComposeCellShell({ title, subtitle, onMoveUp, onMoveDown, onRemove, children }: Props) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onMoveUp} aria-label="Move up">↑</Button>
          <Button size="sm" variant="ghost" onClick={onMoveDown} aria-label="Move down">↓</Button>
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove cell">×</Button>
        </div>
      </div>
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Cell list**

Create `components/features/compose/compose-cell-list.tsx`:

```tsx
'use client'

import type { Dispatch } from 'react'
import type { NotebookCell } from '@/lib/api/types'
import { acredMethodology } from '@/lib/data/acred/methodology'
import type { ComposerAction, ComposerState } from './composer-reducer'
import { ComposeCellShell } from './compose-cell-shell'
import { CellMarkdownEditor } from './cell-markdown-editor'
import { CellQueryEditor } from './cell-query-editor'

type Props = {
  state: ComposerState
  dispatch: Dispatch<ComposerAction>
}

function titleFor(cell: NotebookCell): { title: string; subtitle?: string } {
  if (cell.kind === 'markdown') return { title: 'Markdown' }
  if (cell.kind === 'query') {
    if (cell.methodologyId) {
      const m = acredMethodology.find((x) => x.id === cell.methodologyId)
      if (m) return { title: m.title, subtitle: m.description }
      return { title: 'Custom query', subtitle: `(unknown methodology: ${cell.methodologyId})` }
    }
    return { title: 'Custom query' }
  }
  return { title: cell.kind }
}

export function ComposeCellList({ state, dispatch }: Props) {
  if (state.cells.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface/20 p-6 text-center text-sm text-muted-foreground">
        Pick a methodology entry or add a markdown / custom query cell.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {state.cells.map((cell) => {
        const { title, subtitle } = titleFor(cell)
        return (
          <ComposeCellShell
            key={cell.id}
            title={title}
            subtitle={subtitle}
            onMoveUp={() => dispatch({ type: 'move-cell', id: cell.id, dir: 'up' })}
            onMoveDown={() => dispatch({ type: 'move-cell', id: cell.id, dir: 'down' })}
            onRemove={() => dispatch({ type: 'remove-cell', id: cell.id })}
          >
            {cell.kind === 'markdown' && (
              <CellMarkdownEditor
                value={cell.markdown}
                onChange={(v) => dispatch({ type: 'set-markdown', id: cell.id, markdown: v })}
              />
            )}
            {cell.kind === 'query' && (
              <CellQueryEditor
                cell={cell}
                state={state}
                dispatch={dispatch}
              />
            )}
            {cell.kind !== 'markdown' && cell.kind !== 'query' && (
              <p className="text-xs text-muted-foreground">Unsupported cell kind: {cell.kind}.</p>
            )}
          </ComposeCellShell>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: PASS (will fail until CellMarkdownEditor / CellQueryEditor exist — proceed to Task 10 before testing this).

- [ ] **Step 5: Commit (after Task 10 lands)**

This task is committed together with Task 10 since the cell list imports two editor components that don't exist yet.

---

## Task 10: Markdown and query cell editors

**Files:**

- Create: `components/features/compose/cell-markdown-editor.tsx`
- Create: `components/features/compose/cell-query-editor.tsx`

- [ ] **Step 1: Markdown editor**

Create `components/features/compose/cell-markdown-editor.tsx`:

```tsx
'use client'

import { Textarea } from '@/components/ui/textarea'

type Props = {
  value: string
  onChange: (v: string) => void
}

export function CellMarkdownEditor({ value, onChange }: Props) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="# Section heading…"
      rows={4}
      className="font-mono text-sm"
    />
  )
}
```

- [ ] **Step 2: Query editor**

Create `components/features/compose/cell-query-editor.tsx`:

```tsx
'use client'

import { useEffect, useRef, useState, type Dispatch } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { useDuckDB } from '@/lib/data/use-duckdb'
import type { NotebookCell } from '@/lib/api/types'
import type { ComposerAction, ComposerState } from './composer-reducer'
import { ResultRenderer } from './result-renderer'

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false })

type Props = {
  cell: NotebookCell & { kind: 'query' }
  state: ComposerState
  dispatch: Dispatch<ComposerAction>
}

export function CellQueryEditor({ cell, state, dispatch }: Props) {
  const { db, ready } = useDuckDB()
  const [expandSql, setExpandSql] = useState<boolean>(!cell.methodologyId)
  const result = state.results[cell.id]
  const error = state.errors[cell.id]
  const running = state.running.has(cell.id)
  const shape = cell.renderShape ?? 'table'

  // Auto-run on first mount if there is a DSL and no result yet.
  const autoRanRef = useRef(false)
  useEffect(() => {
    if (autoRanRef.current) return
    if (!ready || !db || !cell.dsl || result || running) return
    autoRanRef.current = true
    runOnce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, db, cell.dsl])

  async function runOnce() {
    if (!db || !cell.dsl) return
    dispatch({ type: 'start-run', id: cell.id })
    const conn = await db.connect()
    const t0 = performance.now()
    try {
      const res = await conn.query(cell.dsl)
      const columns = res.schema.fields.map((f) => f.name)
      const rows = res.toArray().map((r) => r.toJSON() as Record<string, unknown>)
      const runtimeMs = Math.round(performance.now() - t0)
      dispatch({ type: 'finish-run', id: cell.id, result: { columns, rows, runtimeMs } })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      dispatch({ type: 'fail-run', id: cell.id, error: message })
    } finally {
      await conn.close()
    }
  }

  return (
    <div className="grid gap-2">
      {expandSql ? (
        <div className="rounded-md border border-border/60 bg-background">
          <MonacoEditor
            height={Math.max(120, Math.min(320, (cell.dsl.split('\n').length + 2) * 18))}
            defaultLanguage="sql"
            value={cell.dsl}
            onChange={(v) => dispatch({ type: 'set-dsl', id: cell.id, dsl: v ?? '' })}
            options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpandSql(true)}
          className="rounded-md border border-border/60 bg-background px-2 py-1 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {cell.dsl.split('\n')[0].slice(0, 80)}{cell.dsl.length > 80 ? '…' : ''} <span className="text-foreground/40">(click to edit SQL)</span>
        </button>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={runOnce} disabled={!ready || running || !cell.dsl}>
          {running ? 'Running…' : 'Run'}
        </Button>
        {result && (
          <span className="font-mono text-xs text-muted-foreground">{result.runtimeMs} ms · {result.rows.length} rows</span>
        )}
        {error && <span className="text-xs text-destructive">Error: {error}</span>}
      </div>

      {result && !error && <ResultRenderer result={result} shape={shape} />}
    </div>
  )
}
```

- [ ] **Step 3: Typecheck + commit Tasks 9 + 10**

```bash
npm run typecheck
```

Expected: PASS.

```bash
git add components/features/compose/methodology-sidebar.tsx \
        components/features/compose/compose-cell-shell.tsx \
        components/features/compose/compose-cell-list.tsx \
        components/features/compose/cell-markdown-editor.tsx \
        components/features/compose/cell-query-editor.tsx
git commit -m "feat(compose): methodology sidebar, cell list, markdown + Monaco SQL editors"
```

---

## Task 11: Save bar + NotebookComposer root

**Files:**

- Create: `components/features/compose/save-bar.tsx`
- Create: `components/features/compose/notebook-composer.tsx`
- Create: `app/(app)/notebooks/[notebookId]/compose/actions.ts`

- [ ] **Step 1: Save action**

Create `app/(app)/notebooks/[notebookId]/compose/actions.ts`:

```ts
'use server'

import { requireUser } from '@/lib/auth/server'
import { updateNotebookCells, getNotebook } from '@/lib/api/endpoints/notebooks'
import type { NotebookCell } from '@/lib/api/types'

export async function saveNotebookCellsAction(notebookId: string, cells: NotebookCell[]) {
  const session = await requireUser()
  const existing = await getNotebook({ user: session }, notebookId)
  if (existing.authorId !== session.id) {
    throw new Error('Not authorized to edit this notebook')
  }
  return updateNotebookCells({ user: session }, { id: notebookId, cells })
}
```

- [ ] **Step 2: Save bar**

Create `components/features/compose/save-bar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  notebookId: string
  dirty: boolean
  saving: boolean
  onSave: () => void
}

export function SaveBar({ notebookId, dirty, saving, onSave }: Props) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface/80 px-3 py-2 text-sm backdrop-blur">
      <div className="text-xs text-muted-foreground">
        {dirty ? 'Unsaved changes' : 'Saved'}
      </div>
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/notebooks/${notebookId}`}>View</Link>
        </Button>
        <Button size="sm" onClick={onSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Composer root**

Create `components/features/compose/notebook-composer.tsx`:

```tsx
'use client'

import { useReducer, useState } from 'react'
import type { Notebook } from '@/lib/api/types'
import { saveNotebookCellsAction } from '@/app/(app)/notebooks/[notebookId]/compose/actions'
import { composerReducer, initialComposerState } from './composer-reducer'
import { MethodologySidebar } from './methodology-sidebar'
import { ComposeCellList } from './compose-cell-list'
import { SaveBar } from './save-bar'

type Props = { notebook: Notebook }

export function NotebookComposer({ notebook }: Props) {
  const [state, dispatch] = useReducer(composerReducer, initialComposerState(notebook.cells))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await saveNotebookCellsAction(notebook.id, state.cells)
      dispatch({ type: 'reset-from', cells: state.cells })
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <MethodologySidebar
        onAddMethodology={(m) => dispatch({ type: 'add-methodology', methodology: m })}
        onAddMarkdown={() => dispatch({ type: 'add-markdown' })}
        onAddBlankQuery={() => dispatch({ type: 'add-blank-query' })}
      />
      <main className="grid gap-3">
        <SaveBar notebookId={notebook.id} dirty={state.dirty} saving={saving} onSave={handleSave} />
        {saveError && <p className="text-xs text-destructive">Save failed: {saveError}</p>}
        <ComposeCellList state={state} dispatch={dispatch} />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/features/compose/save-bar.tsx \
        components/features/compose/notebook-composer.tsx \
        "app/(app)/notebooks/[notebookId]/compose/actions.ts"
git commit -m "feat(compose): save bar, server action, NotebookComposer root"
```

---

## Task 12: /compose route + loading skeleton

**Files:**

- Create: `app/(app)/notebooks/[notebookId]/compose/page.tsx`
- Create: `app/(app)/notebooks/[notebookId]/compose/loading.tsx`

- [ ] **Step 1: Server page**

Create `app/(app)/notebooks/[notebookId]/compose/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/server'
import { getNotebook } from '@/lib/api/endpoints/notebooks'
import { PageHeader } from '@/components/common/page-header'
import { NotebookComposer } from '@/components/features/compose/notebook-composer'

export default async function ComposePage({ params }: { params: Promise<{ notebookId: string }> }) {
  const { notebookId } = await params
  const session = await requireUser()
  const notebook = await getNotebook({ user: session }, notebookId)
  if (notebook.authorId !== session.id) notFound()
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// compose" title={notebook.title} description={notebook.description} />
      <div className="mt-6">
        <Suspense fallback={null}>
          <NotebookComposer notebook={notebook} />
        </Suspense>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Loading skeleton**

Create `app/(app)/notebooks/[notebookId]/compose/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function ComposeLoading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <Skeleton className="h-10 w-64" />
      <div className="mt-6 grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-[60vh]" />
        <div className="grid gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Visual verification**

Mandatory visual loop. Start the dev server:

```bash
npm run dev &
sleep 12
```

Use Playwright (or browser):
1. Login as demo counterparty.
2. Navigate `/notebooks/new`, submit a title (e.g. "ACRED test memo").
3. You land on viewer. Manually navigate to `/notebooks/<id>/compose` (you can't yet click Edit — it lands in Task 13).
4. Confirm: methodology sidebar with 12 entries grouped by axis renders; cell list is empty with the "pick a methodology entry…" prompt; save bar shows "Saved".
5. Click "NAV over time" in the sidebar. A cell appears with the methodology title, the SQL collapsed by default, and (after ~1-3s DuckDB init) a line chart result.
6. Click 2 more methodology entries: "Top-10 borrower exposure" and "First-lien % of book". Verify the breakdown bars and metric card render.
7. Click "Save". The Save button transitions to disabled; "Unsaved changes" → "Saved".
8. Navigate to `/notebooks/<id>`. The viewer page won't yet show live results (that's Task 13) but the cells should at least be present.

Take 2-3 screenshots. Iterate on visual issues (cramped spacing, layout drift, chart sizing) before continuing.

```bash
pkill -f "next dev" || true
```

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/notebooks/[notebookId]/compose/page.tsx" \
        "app/(app)/notebooks/[notebookId]/compose/loading.tsx"
git commit -m "feat(compose): /compose route with author-gated server page"
```

---

## Task 13: Viewer integration (Edit button + ExecutableQueryCell)

**Files:**

- Create: `components/features/notebooks/executable-query-cell.tsx`
- Modify: `app/(app)/notebooks/[notebookId]/page.tsx`

- [ ] **Step 1: ExecutableQueryCell**

Create `components/features/notebooks/executable-query-cell.tsx`:

```tsx
'use client'

import { useCellQuery } from '@/lib/data/use-cell-query'
import { ResultRenderer } from '@/components/features/compose/result-renderer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { acredMethodology } from '@/lib/data/acred/methodology'
import type { RenderShape } from '@/lib/data/methodology'

type Props = {
  dsl: string
  methodologyId?: string
  renderShape?: RenderShape
}

export function ExecutableQueryCell({ dsl, methodologyId, renderShape }: Props) {
  const m = methodologyId ? acredMethodology.find((x) => x.id === methodologyId) : undefined
  const shape: RenderShape = renderShape ?? m?.shape ?? 'table'
  const state = useCellQuery(dsl)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{m?.title ?? 'Query'}</CardTitle>
        {m?.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
      </CardHeader>
      <CardContent>
        {state.error && <p className="text-xs text-destructive">Error: {state.error.message}</p>}
        {!state.error && !state.ready && <p className="text-xs text-muted-foreground">Running…</p>}
        {state.ready && <ResultRenderer result={state.result} shape={shape} />}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Modify viewer to dispatch + add Edit button**

Read `app/(app)/notebooks/[notebookId]/page.tsx`. Replace the file contents with:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getNotebook } from '@/lib/api/endpoints/notebooks'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { CellMarkdown } from '@/components/features/notebooks/cell-markdown'
import { CellQuery } from '@/components/features/notebooks/cell-query'
import { CellVisualization } from '@/components/features/notebooks/cell-visualization'
import { CellAttestation } from '@/components/features/notebooks/cell-attestation'
import { ExecutableQueryCell } from '@/components/features/notebooks/executable-query-cell'

export default async function NotebookDetail({ params }: { params: Promise<{ notebookId: string }> }) {
  const { notebookId } = await params
  const session = await requireUser()
  const n = await getNotebook({ user: session }, notebookId)
  const canEdit = n.authorId === session.id

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader
        eyebrow="// notebook"
        title={n.title}
        description={n.description}
        actions={canEdit ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/notebooks/${n.id}/compose`}>Edit</Link>
          </Button>
        ) : null}
      />
      <div className="mt-6 grid gap-6">
        {n.cells.map((c) => {
          if (c.kind === 'markdown') return <CellMarkdown key={c.id} markdown={c.markdown} />
          if (c.kind === 'query') {
            if (c.methodologyId || c.renderShape) {
              return (
                <ExecutableQueryCell
                  key={c.id}
                  dsl={c.dsl}
                  methodologyId={c.methodologyId}
                  renderShape={c.renderShape}
                />
              )
            }
            return <CellQuery key={c.id} dsl={c.dsl} runId={c.runId} />
          }
          if (c.kind === 'visualization') return <CellVisualization key={c.id} runId={c.runId} shape={c.shape === 'distribution' ? 'bar' : c.shape} />
          if (c.kind === 'attestation') return <CellAttestation key={c.id} runIds={c.runIds} />
          return null
        })}
      </div>
    </div>
  )
}
```

Note: the `PageHeader` component must accept an `actions` prop. Read `components/common/page-header.tsx` to confirm. If it doesn't, render the Edit button below the header instead.

- [ ] **Step 3: Visual verification**

```bash
npm run dev &
sleep 12
```

1. Login, go to your test notebook viewer.
2. Confirm the "Edit" button is visible (you are the author).
3. Click Edit → land on `/compose`.
4. Confirm composer state restored: the cells you saved in Task 12 are back.
5. Back-navigate to viewer.
6. Confirm cells with `methodologyId` render live via `<ExecutableQueryCell />`: the line chart, breakdown bars, and metric card all appear after ~1-3s DuckDB init.
7. Verify legacy fixture notebooks still render their static query cells (e.g. `/notebooks/nb_q2_credit_memo`).

```bash
pkill -f "next dev" || true
```

- [ ] **Step 4: Commit**

```bash
git add components/features/notebooks/executable-query-cell.tsx \
        "app/(app)/notebooks/[notebookId]/page.tsx"
git commit -m "feat(notebooks): viewer Edit button + ExecutableQueryCell live results"
```

---

## Task 14: E2E spec

**Files:**

- Create: `tests/e2e/compose-acred.spec.ts`

- [ ] **Step 1: Write the spec**

Create `tests/e2e/compose-acred.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('compose: build an ACRED methodology notebook and view live results', async ({ page }) => {
  // Sign in as the demo counterparty (author of new notebooks).
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await expect(page.getByRole('heading', { name: /welcome back, maya/i })).toBeVisible()

  // Create a fresh notebook.
  await page.goto('/notebooks/new')
  await page.getByLabel('Title').fill('ACRED methodology test')
  await page.getByRole('button', { name: /^create$/i }).click()
  await expect(page).toHaveURL(/\/notebooks\/nb_/)
  const notebookUrl = page.url()

  // Open compose via Edit.
  await page.getByRole('link', { name: /^edit$/i }).click()
  await expect(page).toHaveURL(/\/compose$/)
  await expect(page.getByText(/methodology/i).first()).toBeVisible()

  // Add 4 methodology cells (one of each non-trivial shape).
  await page.getByRole('button', { name: /NAV over time/i }).click()       // time-series
  await page.getByRole('button', { name: /current vs 12mo ago/i }).click() // comparison
  await page.getByRole('button', { name: /Top-10 borrower exposure/i }).click() // breakdown
  await page.getByRole('button', { name: /First-lien % of book/i }).click()     // metric

  // Wait for each result to render.
  // time-series: an svg with a path
  await expect(page.locator('svg path').first()).toBeVisible({ timeout: 30_000 })
  // breakdown / comparison: their labels show up in the cell list
  await expect(page.getByText(/top.?10/i).first()).toBeVisible()
  await expect(page.getByText(/first-lien/i).first()).toBeVisible()

  // Save.
  await page.getByRole('button', { name: /^save$/i }).click()
  await expect(page.getByRole('button', { name: /^save$/i })).toBeDisabled({ timeout: 10_000 })

  // Navigate to viewer via the View link.
  await page.getByRole('link', { name: /^view$/i }).click()
  await expect(page).toHaveURL(notebookUrl)

  // Live results render on the viewer.
  await expect(page.locator('svg path').first()).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/NAV over time/i).first()).toBeVisible()
  await expect(page.getByText(/Top-10 borrower exposure/i).first()).toBeVisible()
  await expect(page.getByText(/First-lien % of book/i).first()).toBeVisible()

  // Ensure no methodology DSL produced an error.
  await expect(page.getByText(/^Error: /).first()).toBeHidden()
})
```

- [ ] **Step 2: Run it**

```bash
npm run test:e2e -- compose-acred
```

Expected: PASS in 15-30 seconds. If selectors don't match exactly (e.g. the button label has different casing), adjust them. If a methodology DSL fails to execute, the test surfaces the error text — fix the SQL in `lib/data/acred/methodology.ts` (Task 4) and re-run.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/compose-acred.spec.ts
git commit -m "test(e2e): compose flow with 4 methodology cells + live viewer rendering"
```

---

## Task 15: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full pipeline**

Run in order:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

For each failure, fix targeted. Common cleanups:
- Unused imports → remove
- Type drift from earlier tasks → align
- Lint warnings about React hook deps → either fix dependency array or add precise `eslint-disable-next-line`

- [ ] **Step 2: Production smoke test**

```bash
npm run build && npm start &
sleep 8
curl -sI http://localhost:3000/notebooks/nb_q2_credit_memo 2>&1 | head -5  # expect 200 or 307 (auth redirect)
pkill -f "next start" || true
```

- [ ] **Step 3: Commit any cleanup**

```bash
git add -A
git status
# If nothing changed, skip the commit.
git commit -m "chore(compose): fix typecheck/lint issues in final verification"
```

---

## Out-of-scope reminders

These were deliberately deferred per the spec and should NOT be tackled inside this plan. If you find yourself wanting to do them, stop and flag:

- A new `comparison` cell kind that bundles two queries (Approach C).
- Drag-and-drop reorder via a DnD library.
- Per-cell parameter widgets (dropdown to switch the compare-axis at view time).
- Auto-save during edit.
- Multi-dataset notebooks (a `datasetId` per cell).
- Backend-backed concurrency or share tokens.

A follow-up plan can pick these up once this one ships.
