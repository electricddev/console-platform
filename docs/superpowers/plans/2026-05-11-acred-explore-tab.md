# ACRED Explore Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `Explore` tab on the dataset detail page for the new ACRED dataset that lets users browse, filter, sort, and profile five parquet-backed tables (`borrowers`, `holdings`, `concentration_metrics`, `credit_events`, `fund_overview`) using DuckDB-WASM as an in-browser query engine. No SQL editor surface — exploration is point-and-click and renders consistently across all tables via a curated descriptor file.

**Architecture:** Three-pane client component (table picker · grid + toolbar · column profile) mounted at `/datasets/[datasetId]/explore`. DuckDB-WASM singleton lives in `lib/data/duckdb.ts`, lazily initialized on first explorer mount. Parquets are registered as DuckDB views from `/structured/*.parquet`. All rendering, filtering, and column profiling key off a closed `Format` union populated by `lib/data/acred/tables.ts`.

**Tech Stack:** Next.js 16 App Router (existing) · React 19 (existing) · `@duckdb/duckdb-wasm` (new) · TanStack Table + Virtual (existing) · Recharts (existing) · TypeScript strict · Vitest · Playwright.

**Spec:** `docs/superpowers/specs/2026-05-11-acred-explore-tab-design.md`

**Notes for the implementer:**
- This project uses **npm** (`package-lock.json`), not pnpm — ignore CLAUDE.md's `pnpm` examples. Use `npm run dev`, `npm test`, `npm run test:e2e`.
- All files live under repo root (`app/`, `components/`, `lib/`) — there is no `src/` directory.
- The Stop hook (see CLAUDE.md "How to Fix UI Bugs") will block completion of UI tasks that don't include a Playwright screenshot verification. For UI tasks (12 onward), follow the `visual-fix` loop: screenshot → identify → fix → re-screenshot.
- Conventional Commits style is in use. Commit after each task at minimum.

---

## File Structure

**New files (lib/data foundation):**
- `lib/data/types.ts` — `Format`, `ColumnDescriptor`, `TableDescriptor`, `ResolvedColumn`, `FilterState`.
- `lib/data/duckdb.ts` — singleton initializer + `getDB()`.
- `lib/data/use-duckdb.ts` — `useDuckDB()` hook.
- `lib/data/use-table-schema.ts` — `useTableSchema(tableId)` hook.
- `lib/data/use-table-query.ts` — `useTableQuery({...})` hook.
- `lib/data/use-column-profile.ts` — `useColumnProfile(tableId, columnId)` hook.
- `lib/data/format.ts` — locale formatters for `Format` values.
- `lib/data/format-cell.tsx` — `<Cell value column />` renderer.
- `lib/data/filters.ts` — `FilterState`, SQL builder, URL ser/de.
- `lib/data/registry.ts` — `getTablesForDataset(datasetId)`.
- `lib/data/infer-format.ts` — DuckDB type → `Format` map (table from spec §"Schema merge").
- `lib/data/acred/tables.ts` — ACRED table descriptors.

**New files (UI):**
- `components/features/explore/dataset-explorer.tsx`
- `components/features/explore/table-picker.tsx`
- `components/features/explore/explore-toolbar.tsx`
- `components/features/explore/data-grid.tsx`
- `components/features/explore/column-profile-panel.tsx`
- `components/features/explore/filter-popover.tsx`
- `components/features/explore/filter-widget-numeric.tsx`
- `components/features/explore/filter-widget-enum.tsx`
- `components/features/explore/filter-widget-date.tsx`
- `components/features/explore/filter-widget-text.tsx`
- `components/features/explore/filter-widget-boolean.tsx`
- `components/features/explore/profile-chart-histogram.tsx`
- `components/features/explore/profile-chart-categorical.tsx`
- `components/features/explore/profile-chart-timeline.tsx`
- `components/features/explore/empty-state.tsx`
- `components/features/explore/loading-state.tsx`
- `components/features/explore/error-state.tsx`

**New files (route):**
- `app/(app)/datasets/[datasetId]/explore/page.tsx`
- `app/(app)/datasets/[datasetId]/explore/loading.tsx`

**Modified files:**
- `lib/api/schemas.ts` — add `tables?` to `DatasetSchema`.
- `lib/api/fixtures/orgs.ts` — add `org_apollo`.
- `lib/api/fixtures/datasets.ts` — add `ds_acred`.
- `app/(app)/datasets/[datasetId]/layout.tsx` — make TABS dataset-derived.
- `next.config.ts` — confirm static parquet serving works as-is (no changes expected); add WASM mime config if needed.

**Test files:**
- `tests/unit/format.test.ts` — extend existing.
- `tests/unit/data/format-cell.test.tsx`
- `tests/unit/data/filters.test.ts`
- `tests/unit/data/infer-format.test.ts`
- `tests/unit/data/acred-descriptors.test.ts`
- `tests/e2e/explore-acred.spec.ts`

---

## Task 1: Install DuckDB-WASM and verify static parquet serving

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts` (only if WASM-serving issues surface)
- Verify: `public/structured/*.parquet` are reachable at dev URL

- [ ] **Step 1: Install the dependency**

Run:
```bash
npm install @duckdb/duckdb-wasm
```

Verify it lands as a `dependencies` entry (not `devDependencies`).

- [ ] **Step 2: Start the dev server and confirm parquet URLs serve**

Run:
```bash
npm run dev
```

Open `http://localhost:3000/structured/holdings.parquet` in a browser. You should get a binary download (the parquet file). If Next.js refuses to serve it or returns 404, stop and investigate — likely a `next.config.ts` issue. Default Next 16 serves files in `public/` as-is, so no change is expected.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(deps): add @duckdb/duckdb-wasm"
```

---

## Task 2: Foundation types in lib/data/types.ts

**Files:**
- Create: `lib/data/types.ts`

- [ ] **Step 1: Write the types file**

Create `lib/data/types.ts`:

```ts
export type Format =
  | 'currency'
  | 'percent'
  | 'bps'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'identifier'
  | 'enum'
  | 'text'
  | 'boolean'

export type EnumTone = 'success' | 'warning' | 'danger' | 'neutral'

export type ColumnDescriptor = {
  id: string
  label: string
  description?: string
  format: Format
  unit?: string
  precision?: number
  enumValues?: Record<string, { tone: EnumTone; label?: string }>
  hidden?: boolean
}

export type TableDescriptor = {
  id: string
  label: string
  description: string
  primaryKey: string
  defaultSort?: { column: string; dir: 'asc' | 'desc' }
  columns: ColumnDescriptor[]
}

/** Resolved column = descriptor merged with the DuckDB-reported type. */
export type ResolvedColumn = ColumnDescriptor & {
  duckdbType: string
  curated: boolean
}

export type SortState = { column: string; dir: 'asc' | 'desc' } | null

export type NumericFilter = {
  kind: 'numeric'
  column: string
  min?: number
  max?: number
}

export type EnumFilter = {
  kind: 'enum'
  column: string
  values: string[]
}

export type DateFilter = {
  kind: 'date'
  column: string
  fromISO?: string
  toISO?: string
}

export type TextFilter = {
  kind: 'text'
  column: string
  contains: string
}

export type BooleanFilter = {
  kind: 'boolean'
  column: string
  value: boolean | null
}

export type ColumnFilter =
  | NumericFilter
  | EnumFilter
  | DateFilter
  | TextFilter
  | BooleanFilter

export type FilterState = {
  table: string
  filters: ColumnFilter[]
  sort: SortState
}
```

- [ ] **Step 2: Verify it typechecks**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/data/types.ts
git commit -m "feat(data): foundation types for explore tab"
```

---

## Task 3: DuckDB singleton and useDuckDB hook

**Files:**
- Create: `lib/data/duckdb.ts`
- Create: `lib/data/use-duckdb.ts`

- [ ] **Step 1: Write the singleton initializer**

Create `lib/data/duckdb.ts`:

```ts
'use client'

import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_mvp_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import duckdb_mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null

const PARQUET_FILES = [
  'borrowers',
  'holdings',
  'concentration_metrics',
  'credit_events',
  'fund_overview',
] as const

async function init(): Promise<duckdb.AsyncDuckDB> {
  const bundle: duckdb.DuckDBBundle = {
    mainModule: duckdb_mvp_wasm,
    mainWorker: duckdb_mvp_worker,
  }
  const worker = new Worker(bundle.mainWorker!)
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule)

  // Register each parquet by name and create a view of the same name.
  const conn = await db.connect()
  try {
    for (const name of PARQUET_FILES) {
      const url = `/structured/${name}.parquet`
      await db.registerFileURL(`${name}.parquet`, url, duckdb.DuckDBDataProtocol.HTTP, false)
      await conn.query(`CREATE OR REPLACE VIEW ${name} AS SELECT * FROM read_parquet('${name}.parquet')`)
    }
  } finally {
    await conn.close()
  }
  return db
}

export function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) dbPromise = init()
  return dbPromise
}

/** Test seam: reset the singleton (only used in tests). */
export function __resetDBForTests(): void {
  dbPromise = null
}
```

- [ ] **Step 2: Write the hook**

Create `lib/data/use-duckdb.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'
import type * as duckdb from '@duckdb/duckdb-wasm'
import { getDB } from './duckdb'

export type DuckDBState =
  | { ready: false; db: null; error: null }
  | { ready: false; db: null; error: Error }
  | { ready: true; db: duckdb.AsyncDuckDB; error: null }

export function useDuckDB(): DuckDBState {
  const [state, setState] = useState<DuckDBState>({ ready: false, db: null, error: null })

  useEffect(() => {
    let cancelled = false
    getDB()
      .then((db) => { if (!cancelled) setState({ ready: true, db, error: null }) })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, db: null, error })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS. If the `?url` imports cause TS to complain, add `declare module '*?url' { const src: string; export default src }` to `next-env.d.ts` adjacent — but Next 16 should already declare this.

- [ ] **Step 4: Commit**

```bash
git add lib/data/duckdb.ts lib/data/use-duckdb.ts
git commit -m "feat(data): DuckDB-WASM singleton and useDuckDB hook"
```

---

## Task 4: DuckDB type inference and registry

**Files:**
- Create: `lib/data/infer-format.ts`
- Create: `lib/data/registry.ts`
- Create: `tests/unit/data/infer-format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/data/infer-format.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { inferFormat } from '@/lib/data/infer-format'

describe('inferFormat', () => {
  it('maps integer types to integer', () => {
    expect(inferFormat('INTEGER')).toBe('integer')
    expect(inferFormat('BIGINT')).toBe('integer')
    expect(inferFormat('TINYINT')).toBe('integer')
    expect(inferFormat('SMALLINT')).toBe('integer')
    expect(inferFormat('HUGEINT')).toBe('integer')
  })

  it('maps floating types to decimal', () => {
    expect(inferFormat('DOUBLE')).toBe('decimal')
    expect(inferFormat('FLOAT')).toBe('decimal')
    expect(inferFormat('DECIMAL(10,2)')).toBe('decimal')
  })

  it('maps DATE to date and TIMESTAMP to datetime', () => {
    expect(inferFormat('DATE')).toBe('date')
    expect(inferFormat('TIMESTAMP')).toBe('datetime')
    expect(inferFormat('TIMESTAMP WITH TIME ZONE')).toBe('datetime')
  })

  it('maps BOOLEAN to boolean', () => {
    expect(inferFormat('BOOLEAN')).toBe('boolean')
  })

  it('maps VARCHAR and unknown to text', () => {
    expect(inferFormat('VARCHAR')).toBe('text')
    expect(inferFormat('BLOB')).toBe('text')
  })

  it('is case-insensitive', () => {
    expect(inferFormat('integer')).toBe('integer')
    expect(inferFormat('Date')).toBe('date')
  })
})
```

- [ ] **Step 2: Run the test to see it fail**

Run:
```bash
npm test -- infer-format
```

Expected: FAIL (`Cannot find module '@/lib/data/infer-format'`).

- [ ] **Step 3: Implement inferFormat**

Create `lib/data/infer-format.ts`:

```ts
import type { Format } from './types'

const INTEGER_TYPES = new Set(['TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT', 'HUGEINT', 'UTINYINT', 'USMALLINT', 'UINTEGER', 'UBIGINT'])
const FLOAT_TYPES = new Set(['FLOAT', 'DOUBLE', 'REAL'])

export function inferFormat(duckdbType: string): Format {
  const t = duckdbType.toUpperCase()
  if (t === 'BOOLEAN') return 'boolean'
  if (INTEGER_TYPES.has(t)) return 'integer'
  if (FLOAT_TYPES.has(t) || t.startsWith('DECIMAL') || t.startsWith('NUMERIC')) return 'decimal'
  if (t === 'DATE') return 'date'
  if (t.startsWith('TIMESTAMP')) return 'datetime'
  return 'text'
}
```

- [ ] **Step 4: Run the test to see it pass**

Run:
```bash
npm test -- infer-format
```

Expected: PASS.

- [ ] **Step 5: Write the registry**

Create `lib/data/registry.ts`:

```ts
import type { TableDescriptor } from './types'
import { acredTables } from './acred/tables'

const REGISTRY: Record<string, TableDescriptor[]> = {
  ds_acred: acredTables,
}

export function getTablesForDataset(datasetId: string): TableDescriptor[] | null {
  return REGISTRY[datasetId] ?? null
}
```

(The registry will error on missing `./acred/tables` until Task 5 lands. That's fine — we commit them together if order requires.)

- [ ] **Step 6: Commit (skip until Task 5 is also done)**

Move on to Task 5; commit both together.

---

## Task 5: ACRED descriptors

**Files:**
- Create: `lib/data/acred/tables.ts`
- Create: `tests/unit/data/acred-descriptors.test.ts`

**Note:** Before writing the descriptors, inspect each parquet to learn the actual column names and types. Run a throwaway script or use the DuckDB CLI / Python to do this — do not invent columns. The recommended path:

```bash
# In a Node REPL or one-off script:
# const duckdb = require('@duckdb/duckdb-wasm/dist/duckdb-node.cjs') etc.
# OR simpler: use Python with `pip install duckdb` and run:
#   import duckdb; duckdb.read_parquet('public/structured/holdings.parquet').describe()
```

If Python isn't available, do the discovery from the running app: temporarily wire a debug button that calls `db.query("DESCRIBE holdings")` and console.logs the result. Discard that scratch work before commit.

- [ ] **Step 1: Discover schemas**

Pick whichever of these you have on hand:

**Option A — Python (recommended if available):**
```bash
python3 -c "
import duckdb, os
for f in sorted(os.listdir('public/structured')):
    t = f.replace('.parquet','')
    print(f'\n=== {t} ===')
    con = duckdb.connect()
    print(con.execute(f\"DESCRIBE SELECT * FROM read_parquet('public/structured/{f}')\").fetchdf())
    print(con.execute(f\"SELECT * FROM read_parquet('public/structured/{f}') LIMIT 3\").fetchdf())
"
```
(Requires `pip install duckdb` if not already installed.)

**Option B — DuckDB CLI:**
```bash
duckdb -c "DESCRIBE SELECT * FROM read_parquet('public/structured/holdings.parquet')"
duckdb -c "SELECT * FROM read_parquet('public/structured/holdings.parquet') LIMIT 3"
# Repeat for the other 4 files.
```

**Option C — In the running app:**
After Task 11 lands, paste this into the browser console on `/datasets/ds_acred/explore`:
```js
const { getDB } = await import('/lib/data/duckdb.ts')
const db = await getDB()
const conn = await db.connect()
for (const t of ['fund_overview','borrowers','holdings','concentration_metrics','credit_events']) {
  const r = await conn.query(`DESCRIBE "${t}"`)
  console.log(t, r.toArray().map((x) => x.toJSON()))
}
```

For each of the 5 parquets, capture:
- Column names
- DuckDB-reported types
- A sample row (to disambiguate units — e.g. is `rate` 0.05 or 5.0?)

Write findings to a scratch note (do not commit it).

- [ ] **Step 2: Write the descriptor file**

Create `lib/data/acred/tables.ts`. The shape is fixed; column lists below are the **structure** you must follow — fill in real column ids/labels based on Step 1 discoveries. **Do not invent columns that aren't in the parquet.** Use the inference fallback for any column you're not yet sure how to label (i.e. omit it from the descriptor; it'll render with its raw column name and inferred format).

```ts
import type { TableDescriptor } from '../types'

export const acredTables: TableDescriptor[] = [
  {
    id: 'fund_overview',
    label: 'Fund overview',
    description: 'Top-line ACRED fund metrics: NAV, AUM, weighted yield, vintage spread.',
    primaryKey: /* fill in, e.g. 'snapshot_date' */ '',
    defaultSort: undefined,
    columns: [
      // { id: 'snapshot_date', label: 'As of', format: 'date' },
      // { id: 'nav_usd', label: 'NAV', format: 'currency', unit: 'USD' },
      // ... fill in based on Step 1
    ],
  },
  {
    id: 'borrowers',
    label: 'Borrowers',
    description: 'Underlying obligors across the ACRED book.',
    primaryKey: /* fill in */ '',
    columns: [
      // ... fill in based on Step 1
    ],
  },
  {
    id: 'holdings',
    label: 'Holdings',
    description: 'Loan-level positions, fair value, accrued interest, status.',
    primaryKey: /* fill in */ '',
    columns: [
      // ... fill in based on Step 1
    ],
  },
  {
    id: 'concentration_metrics',
    label: 'Concentration metrics',
    description: 'Diversification metrics: HHI, top-N exposure, sector weights.',
    primaryKey: /* fill in */ '',
    columns: [
      // ... fill in based on Step 1
    ],
  },
  {
    id: 'credit_events',
    label: 'Credit events',
    description: 'Watchlist events, defaults, restructurings, recoveries.',
    primaryKey: /* fill in */ '',
    columns: [
      // ... fill in based on Step 1
    ],
  },
]
```

For columns where you have high confidence about semantics:
- Currency columns (e.g. `*_usd`, `*_balance`, `*_value`) → `format: 'currency', unit: 'USD'`.
- Rate / percent columns (e.g. `*_pct`, `*_rate`, `yield`) → `format: 'percent'` (if stored as fraction) or annotate `precision` if stored as 0–100.
- Date columns → `format: 'date'`.
- Status / rating / sector → `format: 'enum'` with `enumValues` mapping observed values to tones (`AAA/AA/A` → success, `BBB/BB` → neutral, `B/CCC` → warning, `D/Default` → danger; sectors → neutral).
- Identifier columns (e.g. `borrower_id`, `loan_id`, `cusip`) → `format: 'identifier'`.

- [ ] **Step 3: Write the descriptor structure test**

Create `tests/unit/data/acred-descriptors.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { acredTables } from '@/lib/data/acred/tables'

const FORMATS = new Set([
  'currency', 'percent', 'bps', 'integer', 'decimal',
  'date', 'datetime', 'identifier', 'enum', 'text', 'boolean',
])

describe('acredTables descriptors', () => {
  it('has all 5 expected tables', () => {
    const ids = acredTables.map((t) => t.id).sort()
    expect(ids).toEqual([
      'borrowers',
      'concentration_metrics',
      'credit_events',
      'fund_overview',
      'holdings',
    ])
  })

  it('every table has a non-empty primaryKey and at least one column', () => {
    for (const t of acredTables) {
      expect(t.primaryKey, `table ${t.id} missing primaryKey`).toBeTruthy()
      expect(t.columns.length, `table ${t.id} has no columns`).toBeGreaterThan(0)
    }
  })

  it('every column has id, label, and a valid format', () => {
    for (const t of acredTables) {
      for (const c of t.columns) {
        expect(c.id, `table ${t.id} column without id`).toBeTruthy()
        expect(c.label, `table ${t.id}.${c.id} missing label`).toBeTruthy()
        expect(FORMATS.has(c.format), `table ${t.id}.${c.id} invalid format`).toBe(true)
      }
    }
  })

  it('primaryKey references a real column', () => {
    for (const t of acredTables) {
      const ids = new Set(t.columns.map((c) => c.id))
      expect(ids.has(t.primaryKey), `table ${t.id} primaryKey ${t.primaryKey} missing from columns`).toBe(true)
    }
  })

  it('column ids are unique within a table', () => {
    for (const t of acredTables) {
      const seen = new Set<string>()
      for (const c of t.columns) {
        expect(seen.has(c.id), `table ${t.id} duplicate column ${c.id}`).toBe(false)
        seen.add(c.id)
      }
    }
  })
})
```

- [ ] **Step 4: Run tests**

Run:
```bash
npm test -- acred-descriptors infer-format
```

Expected: PASS. If a table has no descriptors yet (you couldn't discover schema for one of them), the `at least one column` assertion will fail — finish the discovery before committing.

- [ ] **Step 5: Commit Task 4 and Task 5 together**

```bash
git add lib/data/infer-format.ts lib/data/registry.ts lib/data/acred/tables.ts \
        tests/unit/data/infer-format.test.ts tests/unit/data/acred-descriptors.test.ts
git commit -m "feat(data): ACRED descriptors, registry, and DuckDB type inference"
```

---

## Task 6: Format functions and Cell renderer

**Files:**
- Create: `lib/data/format.ts`
- Create: `lib/data/format-cell.tsx`
- Create: `tests/unit/data/format-cell.test.tsx`

- [ ] **Step 1: Write the format functions**

Create `lib/data/format.ts`:

```ts
import type { ColumnDescriptor } from './types'
import { fmtCurrency, fmtNumber, fmtPct, fmtDate } from '@/lib/format'

export function formatValue(value: unknown, col: ColumnDescriptor): string {
  if (value === null || value === undefined) return '—'

  switch (col.format) {
    case 'currency': {
      const n = Number(value)
      return fmtCurrency(n, { currency: col.unit ?? 'USD', decimals: col.precision ?? 0 })
    }
    case 'percent': {
      const n = Number(value)
      return fmtPct(n, { decimals: col.precision ?? 1 })
    }
    case 'bps': {
      const n = Number(value)
      return `${fmtNumber(n, { decimals: col.precision ?? 0 })} bps`
    }
    case 'integer':
      return fmtNumber(Number(value), { decimals: 0 })
    case 'decimal':
      return fmtNumber(Number(value), { decimals: col.precision ?? 2 })
    case 'date':
      return fmtDate(value as string | Date, { pattern: 'yyyy-MM-dd' })
    case 'datetime':
      return fmtDate(value as string | Date, { pattern: 'yyyy-MM-dd HH:mm' })
    case 'identifier':
    case 'enum':
    case 'text':
      return String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
  }
}
```

- [ ] **Step 2: Write the failing Cell renderer test**

Create `tests/unit/data/format-cell.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cell } from '@/lib/data/format-cell'
import type { ColumnDescriptor } from '@/lib/data/types'

const col = (overrides: Partial<ColumnDescriptor> & Pick<ColumnDescriptor, 'format'>): ColumnDescriptor => ({
  id: 'x', label: 'X', ...overrides,
})

describe('<Cell />', () => {
  it('renders null as em-dash', () => {
    render(<Cell value={null} column={col({ format: 'integer' })} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders currency right-aligned mono', () => {
    const { container } = render(<Cell value={1234.5} column={col({ format: 'currency', unit: 'USD' })} />)
    expect(container.textContent).toContain('$1,234')
    expect(container.firstChild).toHaveClass('font-mono')
    expect(container.firstChild).toHaveClass('text-right')
  })

  it('renders percent', () => {
    render(<Cell value={0.075} column={col({ format: 'percent' })} />)
    expect(screen.getByText(/7\.5%/)).toBeInTheDocument()
  })

  it('renders enum as a badge with tone classes', () => {
    render(
      <Cell
        value="AAA"
        column={col({ format: 'enum', enumValues: { AAA: { tone: 'success' } } })}
      />
    )
    const badge = screen.getByText('AAA')
    expect(badge).toBeInTheDocument()
  })

  it('renders identifier mono', () => {
    const { container } = render(<Cell value="ldn_001" column={col({ format: 'identifier' })} />)
    expect(container.firstChild).toHaveClass('font-mono')
    expect(container.textContent).toBe('ldn_001')
  })

  it('renders boolean Yes/No', () => {
    render(<Cell value={true} column={col({ format: 'boolean' })} />)
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run to see it fail**

Run:
```bash
npm test -- format-cell
```

Expected: FAIL (module not found).

- [ ] **Step 4: Write the Cell renderer**

Create `lib/data/format-cell.tsx`:

```tsx
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ColumnDescriptor, EnumTone } from './types'
import { formatValue } from './format'

const TONE_CLASS: Record<EnumTone, string> = {
  success: 'bg-success/15 text-success border-success/30',
  warning: 'bg-warning/15 text-warning border-warning/30',
  danger:  'bg-destructive/15 text-destructive border-destructive/30',
  neutral: 'bg-muted text-muted-foreground border-border',
}

const NUMERIC: ReadonlyArray<ColumnDescriptor['format']> = ['currency', 'percent', 'bps', 'integer', 'decimal']

export function Cell({ value, column }: { value: unknown; column: ColumnDescriptor }) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }

  if (column.format === 'enum') {
    const def = column.enumValues?.[String(value)]
    const tone: EnumTone = def?.tone ?? 'neutral'
    return (
      <Badge variant="outline" className={cn(TONE_CLASS[tone], 'font-normal')}>
        {def?.label ?? String(value)}
      </Badge>
    )
  }

  const text = formatValue(value, column)
  const isNumeric = NUMERIC.includes(column.format)
  const isMono = isNumeric || column.format === 'identifier' || column.format === 'date' || column.format === 'datetime'

  return (
    <span className={cn(isMono && 'font-mono text-xs', isNumeric && 'text-right block tabular-nums')}>
      {text}
    </span>
  )
}
```

- [ ] **Step 5: Run tests to see them pass**

Run:
```bash
npm test -- format-cell
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/data/format.ts lib/data/format-cell.tsx tests/unit/data/format-cell.test.tsx
git commit -m "feat(data): format functions and <Cell /> renderer"
```

---

## Task 7: Filter state, SQL builder, URL serialization

**Files:**
- Create: `lib/data/filters.ts`
- Create: `tests/unit/data/filters.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/data/filters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildWhereClause, encodeFilterState, decodeFilterState } from '@/lib/data/filters'
import type { FilterState } from '@/lib/data/types'

describe('buildWhereClause', () => {
  it('returns empty string when no filters', () => {
    const { sql, params } = buildWhereClause([])
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('builds numeric range with min and max', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'numeric', column: 'arr_balance', min: 100, max: 1000 },
    ])
    expect(sql).toBe('WHERE "arr_balance" >= ? AND "arr_balance" <= ?')
    expect(params).toEqual([100, 1000])
  })

  it('builds numeric range with only min', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'numeric', column: 'arr_balance', min: 100 },
    ])
    expect(sql).toBe('WHERE "arr_balance" >= ?')
    expect(params).toEqual([100])
  })

  it('builds enum filter as IN clause', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'enum', column: 'rating', values: ['AAA', 'AA'] },
    ])
    expect(sql).toBe('WHERE "rating" IN (?, ?)')
    expect(params).toEqual(['AAA', 'AA'])
  })

  it('skips empty enum filter', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'enum', column: 'rating', values: [] },
    ])
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('builds date range', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'date', column: 'funded_at', fromISO: '2025-01-01', toISO: '2025-06-30' },
    ])
    expect(sql).toBe('WHERE "funded_at" >= ? AND "funded_at" <= ?')
    expect(params).toEqual(['2025-01-01', '2025-06-30'])
  })

  it('builds text contains case-insensitive', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'text', column: 'industry', contains: 'tech' },
    ])
    expect(sql).toBe('WHERE LOWER("industry") LIKE ?')
    expect(params).toEqual(['%tech%'])
  })

  it('builds boolean filter', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'boolean', column: 'watchlist', value: true },
    ])
    expect(sql).toBe('WHERE "watchlist" = ?')
    expect(params).toEqual([true])
  })

  it('skips boolean filter when value is null', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'boolean', column: 'watchlist', value: null },
    ])
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('joins multiple filters with AND', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'numeric', column: 'arr', min: 1 },
      { kind: 'enum', column: 'rating', values: ['AAA'] },
    ])
    expect(sql).toBe('WHERE "arr" >= ? AND "rating" IN (?)')
    expect(params).toEqual([1, 'AAA'])
  })
})

describe('FilterState url roundtrip', () => {
  const state: FilterState = {
    table: 'holdings',
    sort: { column: 'arr_balance', dir: 'desc' },
    filters: [
      { kind: 'numeric', column: 'arr_balance', min: 100, max: 1000 },
      { kind: 'enum', column: 'rating', values: ['AAA', 'AA'] },
    ],
  }

  it('encode then decode roundtrips', () => {
    const encoded = encodeFilterState(state)
    expect(typeof encoded).toBe('string')
    const decoded = decodeFilterState(encoded)
    expect(decoded).toEqual(state)
  })

  it('decode returns null on invalid input', () => {
    expect(decodeFilterState('not-base64-or-json')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to see them fail**

Run:
```bash
npm test -- filters
```

Expected: FAIL (module not found).

- [ ] **Step 3: Implement filters.ts**

Create `lib/data/filters.ts`:

```ts
import type { ColumnFilter, FilterState } from './types'

export type WhereBuilt = { sql: string; params: unknown[] }

function quoteIdent(col: string): string {
  // DuckDB identifier; escape any embedded quotes.
  return `"${col.replace(/"/g, '""')}"`
}

export function buildWhereClause(filters: ColumnFilter[]): WhereBuilt {
  const parts: string[] = []
  const params: unknown[] = []

  for (const f of filters) {
    const id = quoteIdent(f.column)
    if (f.kind === 'numeric') {
      if (f.min !== undefined) { parts.push(`${id} >= ?`); params.push(f.min) }
      if (f.max !== undefined) { parts.push(`${id} <= ?`); params.push(f.max) }
    } else if (f.kind === 'enum') {
      if (f.values.length === 0) continue
      const placeholders = f.values.map(() => '?').join(', ')
      parts.push(`${id} IN (${placeholders})`)
      params.push(...f.values)
    } else if (f.kind === 'date') {
      if (f.fromISO) { parts.push(`${id} >= ?`); params.push(f.fromISO) }
      if (f.toISO) { parts.push(`${id} <= ?`); params.push(f.toISO) }
    } else if (f.kind === 'text') {
      if (!f.contains) continue
      parts.push(`LOWER(${id}) LIKE ?`)
      params.push(`%${f.contains.toLowerCase()}%`)
    } else if (f.kind === 'boolean') {
      if (f.value === null) continue
      parts.push(`${id} = ?`)
      params.push(f.value)
    }
  }

  if (parts.length === 0) return { sql: '', params: [] }
  return { sql: `WHERE ${parts.join(' AND ')}`, params }
}

export function encodeFilterState(state: FilterState): string {
  const json = JSON.stringify(state)
  // base64url
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeFilterState(encoded: string): FilterState | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded)
    const parsed = JSON.parse(json) as FilterState
    if (typeof parsed !== 'object' || parsed === null) return null
    if (typeof parsed.table !== 'string' || !Array.isArray(parsed.filters)) return null
    return parsed
  } catch {
    return null
  }
}
```

- [ ] **Step 4: Run to see them pass**

Run:
```bash
npm test -- filters
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/data/filters.ts tests/unit/data/filters.test.ts
git commit -m "feat(data): filter state, SQL builder, URL ser/de"
```

---

## Task 8: useTableSchema and useTableQuery hooks

**Files:**
- Create: `lib/data/use-table-schema.ts`
- Create: `lib/data/use-table-query.ts`

These hooks talk to the DuckDB-WASM instance, which only runs in a real browser. We do not unit-test them with jsdom — they're exercised by the E2E spec in Task 19. Keep them small and focused so the integration test catches everything.

- [ ] **Step 1: Write useTableSchema**

Create `lib/data/use-table-schema.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'
import type { ResolvedColumn, TableDescriptor } from './types'
import { useDuckDB } from './use-duckdb'
import { inferFormat } from './infer-format'

type SchemaState =
  | { ready: false; columns: null; error: null }
  | { ready: false; columns: null; error: Error }
  | { ready: true; columns: ResolvedColumn[]; error: null }

export function useTableSchema(table: TableDescriptor | null): SchemaState {
  const { db, ready: dbReady } = useDuckDB()
  const [state, setState] = useState<SchemaState>({ ready: false, columns: null, error: null })

  useEffect(() => {
    if (!dbReady || !db || !table) return
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      try {
        const result = await conn.query(`DESCRIBE "${table.id}"`)
        type DescribeRow = { column_name: string; column_type: string }
        const rows = result.toArray().map((r) => r.toJSON() as unknown as DescribeRow)
        const descByCol = new Map(table.columns.map((c) => [c.id, c]))
        const resolved: ResolvedColumn[] = rows.map((r) => {
          const d = descByCol.get(r.column_name)
          if (d) {
            return { ...d, duckdbType: r.column_type, curated: true }
          }
          return {
            id: r.column_name,
            label: r.column_name,
            format: inferFormat(r.column_type),
            duckdbType: r.column_type,
            curated: false,
          }
        })
        if (!cancelled) setState({ ready: true, columns: resolved, error: null })

        // Drift warning: descriptor columns missing from DuckDB.
        const duckCols = new Set(rows.map((r) => r.column_name))
        for (const d of table.columns) {
          if (!duckCols.has(d.id)) {
            console.warn(`[descriptor-drift] table "${table.id}" describes "${d.id}" but parquet has no such column`)
          }
        }
      } catch (err: unknown) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, columns: null, error })
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, dbReady, table])

  return state
}
```

- [ ] **Step 2: Write useTableQuery**

Create `lib/data/use-table-query.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'
import { useDuckDB } from './use-duckdb'
import { buildWhereClause } from './filters'
import type { ColumnFilter, SortState } from './types'

export type QueryInput = {
  table: string
  filters: ColumnFilter[]
  sort: SortState
  limit: number
  offset: number
}

type QueryState =
  | { ready: false; rows: null; totalCount: null; error: null }
  | { ready: false; rows: null; totalCount: null; error: Error }
  | { ready: true; rows: Record<string, unknown>[]; totalCount: number; error: null }

export function useTableQuery(input: QueryInput): QueryState {
  const { db, ready } = useDuckDB()
  const [state, setState] = useState<QueryState>({ ready: false, rows: null, totalCount: null, error: null })

  useEffect(() => {
    if (!ready || !db) return
    let cancelled = false

    const handle = setTimeout(() => {
      ;(async () => {
        const conn = await db.connect()
        try {
          const { sql: where, params } = buildWhereClause(input.filters)
          const orderBy = input.sort
            ? `ORDER BY "${input.sort.column.replace(/"/g, '""')}" ${input.sort.dir.toUpperCase()}`
            : ''
          const dataSQL = `SELECT * FROM "${input.table}" ${where} ${orderBy} LIMIT ${input.limit} OFFSET ${input.offset}`
          const countSQL = `SELECT COUNT(*)::BIGINT AS c FROM "${input.table}" ${where}`

          const dataStmt = await conn.prepare(dataSQL)
          const countStmt = await conn.prepare(countSQL)
          try {
            const dataResult = await dataStmt.query(...params)
            const countResult = await countStmt.query(...params)
            const rows = dataResult.toArray().map((r) => r.toJSON() as Record<string, unknown>)
            const total = Number((countResult.toArray()[0] as unknown as { c: bigint | number }).c)
            if (!cancelled) setState({ ready: true, rows, totalCount: total, error: null })
          } finally {
            await dataStmt.close()
            await countStmt.close()
          }
        } catch (err: unknown) {
          if (cancelled) return
          const error = err instanceof Error ? err : new Error(String(err))
          setState({ ready: false, rows: null, totalCount: null, error })
        } finally {
          await conn.close()
        }
      })()
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
    // Stringify filters/sort for stable identity. Cheap given size.
  }, [db, ready, input.table, input.limit, input.offset, JSON.stringify(input.filters), JSON.stringify(input.sort)])

  return state
}
```

- [ ] **Step 3: Typecheck**

Run:
```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/data/use-table-schema.ts lib/data/use-table-query.ts
git commit -m "feat(data): useTableSchema and useTableQuery hooks"
```

---

## Task 9: Dataset model extension and fixture additions

**Files:**
- Modify: `lib/api/schemas.ts:158-183`
- Modify: `lib/api/fixtures/orgs.ts`
- Modify: `lib/api/fixtures/datasets.ts`

- [ ] **Step 1: Add `tables` to DatasetSchema**

In `lib/api/schemas.ts`, locate the `DatasetSchema` block (around line 158) and append a new optional field before the closing brace:

```ts
  tables: z.array(z.object({ id: z.string() })).optional(),
```

Save and run `npm run typecheck` — should still pass (existing fixtures don't break since the field is optional).

- [ ] **Step 2: Add org_apollo to orgs fixture**

In `lib/api/fixtures/orgs.ts`, append to the `orgFixtures` array:

```ts
  {
    id: 'org_apollo',
    name: 'Apollo',
    description: 'Tokenized diversified private credit fund (ACRED).',
    assetClasses: ['private-credit'],
    verified: true,
  },
```

- [ ] **Step 3: Add ds_acred to datasets fixture**

In `lib/api/fixtures/datasets.ts`, append to the `datasetFixtures` array:

```ts
  {
    id: 'ds_acred',
    name: 'ACRED',
    description: 'Apollo Diversified Credit (tokenized). Daily borrower-level snapshots, holdings, concentration, and credit events.',
    originatorOrgId: 'org_apollo',
    assetClass: 'private-credit',
    geography: 'Global',
    schemaId: 'sch_acred_v1',
    schemaVersion: 1,
    recordCount: 14_000,
    lastAttestedAt: ts(20),
    completenessPct: 0.995,
    status: 'active',
    templateCount: 0,
    lifetimeRunCount: 0,
    attestation: baseAtt('acred'),
    watching: false,
    alerts: [],
    tables: [
      { id: 'fund_overview' },
      { id: 'borrowers' },
      { id: 'holdings' },
      { id: 'concentration_metrics' },
      { id: 'credit_events' },
    ],
  },
```

Add a stub `sch_acred_v1` to `lib/api/fixtures/schemas-fx.ts` so the Schema tab doesn't throw when clicked. Copy an existing schema fixture entry, change `id` to `sch_acred_v1`, set `version: 1`, set `name` to something like "ACRED v1", and update `publishedAt` to a recent timestamp. The Schema tab will render generic/mock content — that's accepted scope per the spec.

- [ ] **Step 4: Verify dev server**

Run:
```bash
npm run dev
```

Navigate to `/datasets`, confirm ACRED appears in the list. Click into ACRED. Confirm the Overview tab loads (it should — uses fixture data only). Schema tab may 404 if you didn't add the stub; that's fine for now if your dev session doesn't touch it.

- [ ] **Step 5: Commit**

```bash
git add lib/api/schemas.ts lib/api/fixtures/orgs.ts lib/api/fixtures/datasets.ts
git commit -m "feat(fixtures): add ACRED dataset and Apollo org with parquet tables"
```

---

## Task 10: Dataset-derived tabs in layout

**Files:**
- Modify: `app/(app)/datasets/[datasetId]/layout.tsx`

- [ ] **Step 1: Make TABS derive from dataset**

Replace the static `TABS` constant in `layout.tsx` with a derivation. Find this block:

```ts
const TABS = [
  { href: '', label: 'Overview' },
  { href: '/schema', label: 'Schema' },
  { href: '/templates', label: 'Templates' },
  { href: '/runs', label: 'Runs' },
  { href: '/lineage', label: 'Lineage' },
] as const
```

Replace with a function and call site:

```ts
import type { Dataset } from '@/lib/api/types'

function tabsFor(ds: Dataset) {
  const base = [{ href: '', label: 'Overview' as const }]
  if (ds.tables && ds.tables.length > 0) {
    base.push({ href: '/explore', label: 'Explore' as const })
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

And in the JSX, change `{TABS.map(...)}` to `{tabsFor(ds).map(...)}`.

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, navigate to `/datasets/ds_acred`. The tab bar should now read: `Overview · Explore · Schema · Templates · Runs · Lineage`. Other datasets (e.g. `/datasets/ds_mfone`) should still show `Overview · Schema · Templates · Runs · Lineage` (no Explore).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/layout.tsx
git commit -m "feat(datasets): dataset-derived tabs (Explore appears for parquet-backed sets)"
```

---

## Task 11: /explore route shell with skeleton

**Files:**
- Create: `app/(app)/datasets/[datasetId]/explore/page.tsx`
- Create: `app/(app)/datasets/[datasetId]/explore/loading.tsx`
- Create: `components/features/explore/dataset-explorer.tsx`
- Create: `components/features/explore/loading-state.tsx`

- [ ] **Step 1: Write the route page (server)**

Create `app/(app)/datasets/[datasetId]/explore/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getDataset } from '@/lib/api/endpoints/datasets'
import { getTablesForDataset } from '@/lib/data/registry'
import { DatasetExplorer } from '@/components/features/explore/dataset-explorer'

export default async function ExploreTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const ds = await getDataset({ user: session }, datasetId)
  if (!ds.tables || ds.tables.length === 0) notFound()
  const tables = getTablesForDataset(datasetId)
  if (!tables) notFound()
  return <DatasetExplorer datasetId={datasetId} tables={tables} />
}
```

- [ ] **Step 2: Write the loading skeleton**

Create `app/(app)/datasets/[datasetId]/explore/loading.tsx`:

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function ExploreLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <Skeleton className="h-[60vh]" />
      <Skeleton className="h-[60vh]" />
      <Skeleton className="h-[60vh] hidden md:block" />
    </div>
  )
}
```

- [ ] **Step 3: Write the LoadingState client component**

Create `components/features/explore/loading-state.tsx`:

```tsx
'use client'

export function LoadingState({ label = 'Initializing query engine…' }: { label?: string }) {
  return (
    <div className="grid h-[40vh] place-items-center text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <span className="size-1.5 animate-pulse rounded-full bg-foreground/40" />
        <span>{label}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write the DatasetExplorer shell**

Create `components/features/explore/dataset-explorer.tsx`:

```tsx
'use client'

import { useState } from 'react'
import type { TableDescriptor } from '@/lib/data/types'
import { useDuckDB } from '@/lib/data/use-duckdb'
import { LoadingState } from './loading-state'

type Props = { datasetId: string; tables: TableDescriptor[] }

export function DatasetExplorer({ datasetId: _datasetId, tables }: Props) {
  const { ready, error } = useDuckDB()
  const [activeTableId, setActiveTableId] = useState<string>(tables[0]?.id ?? '')

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        Failed to start the query engine: {error.message}
      </div>
    )
  }

  if (!ready) {
    return <LoadingState />
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <aside className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
        <div className="mb-2 font-tag text-foreground/60">{'// tables'}</div>
        <ul className="grid gap-1">
          {tables.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActiveTableId(t.id)}
                className={`w-full rounded px-2 py-1 text-left hover:bg-accent ${t.id === activeTableId ? 'bg-accent' : ''}`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="rounded-lg border border-border bg-surface/40 p-3">
        <p className="text-sm text-muted-foreground">Grid placeholder for <code className="font-mono">{activeTableId}</code>.</p>
      </main>
      <aside className="hidden rounded-lg border border-border bg-surface/40 p-3 text-sm md:block">
        <p className="text-muted-foreground">Profile panel placeholder.</p>
      </aside>
    </div>
  )
}
```

- [ ] **Step 5: Manual verify**

Run `npm run dev`, navigate to `/datasets/ds_acred/explore`. Expected:
1. Loading skeleton appears briefly.
2. Then "Initializing query engine…" shimmer for ~1–3s.
3. Then the three-pane layout with the 5 ACRED tables in the left rail and "Grid placeholder for <table>" in the center.

If you see a DuckDB worker error in the console, the most likely cause is the `?url` import — see Task 3 Step 3 troubleshooting.

Open Chrome DevTools → Network: confirm `*.parquet` URLs are fetched (DuckDB does this on the first query, not at init, so you may not see them yet — that's OK).

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/datasets/\[datasetId\]/explore components/features/explore
git commit -m "feat(explore): /explore route shell with DuckDB init and table picker"
```

---

## Task 12: TablePicker as its own component

**Files:**
- Create: `components/features/explore/table-picker.tsx`
- Modify: `components/features/explore/dataset-explorer.tsx`

- [ ] **Step 1: Extract TablePicker**

Create `components/features/explore/table-picker.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import type * as duckdb from '@duckdb/duckdb-wasm'
import type { TableDescriptor } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { fmtNumber } from '@/lib/format'

type Props = {
  db: duckdb.AsyncDuckDB
  tables: TableDescriptor[]
  activeId: string
  onSelect: (id: string) => void
}

export function TablePicker({ db, tables, activeId, onSelect }: Props) {
  const [counts, setCounts] = useState<Record<string, number | null>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      try {
        for (const t of tables) {
          const res = await conn.query(`SELECT COUNT(*)::BIGINT AS c FROM "${t.id}"`)
          const c = Number((res.toArray()[0] as unknown as { c: bigint }).c)
          if (cancelled) return
          setCounts((prev) => ({ ...prev, [t.id]: c }))
        }
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, tables])

  return (
    <aside className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
      <div className="mb-2 font-tag text-foreground/60">{'// tables'}</div>
      <ul className="grid gap-1">
        {tables.map((t) => {
          const active = t.id === activeId
          const count = counts[t.id]
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'w-full rounded px-2 py-1.5 text-left hover:bg-accent',
                  active && 'bg-accent text-foreground',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{t.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {count == null ? '…' : fmtNumber(count)}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 2: Swap into DatasetExplorer**

In `components/features/explore/dataset-explorer.tsx`, replace the inline `<aside>...</aside>` for the left rail with:

```tsx
<TablePicker db={db} tables={tables} activeId={activeTableId} onSelect={setActiveTableId} />
```

Update the early returns so that we only render content when both `ready` and `db` are present. The final shape of the success branch:

```tsx
if (!ready || !db) return <LoadingState />
return (
  <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
    <TablePicker db={db} tables={tables} activeId={activeTableId} onSelect={setActiveTableId} />
    <main className="rounded-lg border border-border bg-surface/40 p-3">
      <p className="text-sm text-muted-foreground">Grid placeholder for <code className="font-mono">{activeTableId}</code>.</p>
    </main>
    <aside className="hidden rounded-lg border border-border bg-surface/40 p-3 text-sm md:block">
      <p className="text-muted-foreground">Profile panel placeholder.</p>
    </aside>
  </div>
)
```

Add the import at the top:

```ts
import { TablePicker } from './table-picker'
```

- [ ] **Step 3: Manual verify**

Run `npm run dev` and visit `/datasets/ds_acred/explore`. Each table row in the left rail should show its row count after a short delay. Switching tables should highlight the active one.

Trigger the visual-fix loop here: screenshot the page, confirm spacing/alignment, iterate if anything looks off.

- [ ] **Step 4: Commit**

```bash
git add components/features/explore/table-picker.tsx components/features/explore/dataset-explorer.tsx
git commit -m "feat(explore): TablePicker with live row counts"
```

---

## Task 13: DataGrid with sort and pagination (no filters yet)

**Files:**
- Create: `components/features/explore/data-grid.tsx`
- Create: `components/features/explore/empty-state.tsx`
- Modify: `components/features/explore/dataset-explorer.tsx`

- [ ] **Step 1: EmptyState component**

Create `components/features/explore/empty-state.tsx`:

```tsx
'use client'

export function EmptyState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="grid h-[40vh] place-items-center gap-3 text-center text-sm text-muted-foreground">
      <p>{message}</p>
      {action}
    </div>
  )
}
```

- [ ] **Step 2: DataGrid component**

Create `components/features/explore/data-grid.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import type { ResolvedColumn, SortState, TableDescriptor } from '@/lib/data/types'
import { Cell } from '@/lib/data/format-cell'
import { useTableSchema } from '@/lib/data/use-table-schema'
import { useTableQuery } from '@/lib/data/use-table-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fmtNumber } from '@/lib/format'
import { EmptyState } from './empty-state'
import { LoadingState } from './loading-state'

const PAGE_SIZE = 50

type Props = {
  table: TableDescriptor
  onFocusColumn?: (column: ResolvedColumn) => void
}

export function DataGrid({ table, onFocusColumn }: Props) {
  const schema = useTableSchema(table)
  const [page, setPage] = useState(0)
  const [sort, setSort] = useState<SortState>(table.defaultSort ?? null)

  const query = useTableQuery({
    table: table.id,
    filters: [],
    sort,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!schema.ready) return []
    return schema.columns
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        accessorKey: c.id,
        header: c.label,
        cell: ({ getValue }) => <Cell value={getValue()} column={c} />,
        meta: { column: c },
      }))
  }, [schema])

  const tableInstance = useReactTable({
    data: query.ready ? query.rows : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (!schema.ready) {
    if (schema.error) {
      return <EmptyState message={`Failed to load schema: ${schema.error.message}`} />
    }
    return <LoadingState label="Loading schema…" />
  }

  if (!query.ready) {
    if (query.error) {
      return <EmptyState message={`Query failed: ${query.error.message}`} />
    }
    return <LoadingState label="Running query…" />
  }

  if (query.rows.length === 0) {
    return <EmptyState message="No rows in this table." />
  }

  const totalPages = Math.max(1, Math.ceil(query.totalCount / PAGE_SIZE))

  function toggleSort(columnId: string) {
    setSort((prev) => {
      if (!prev || prev.column !== columnId) return { column: columnId, dir: 'asc' }
      if (prev.dir === 'asc') return { column: columnId, dir: 'desc' }
      return null
    })
    setPage(0)
  }

  return (
    <div className="grid gap-2">
      <div className="overflow-auto rounded-lg border border-border bg-surface/40">
        <table className="w-full text-sm">
          <thead className="bg-surface/80 text-muted-foreground">
            {tableInstance.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => {
                  const colMeta = h.column.columnDef.meta as { column: ResolvedColumn } | undefined
                  const col = colMeta?.column
                  const isSorted = sort?.column === h.id
                  return (
                    <th key={h.id} className="px-3 py-2 text-left font-medium">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleSort(h.id)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          aria-label={`Sort by ${flexRender(h.column.columnDef.header, h.getContext())}`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span className={cn('text-xs', !isSorted && 'opacity-30')}>
                            {sort?.dir === 'desc' && isSorted ? '↓' : '↑'}
                          </span>
                        </button>
                        {col && onFocusColumn && (
                          <button
                            type="button"
                            onClick={() => onFocusColumn(col)}
                            className="ml-auto rounded p-1 text-xs text-muted-foreground hover:bg-accent"
                            aria-label={`Focus column ${col.label} in profile panel`}
                          >
                            ⌕
                          </button>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-accent/30">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-1.5 align-middle">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div>
          {fmtNumber(query.totalCount)} rows · page {page + 1} of {totalPages}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire DataGrid into DatasetExplorer**

In `dataset-explorer.tsx`, replace the center placeholder with the active table's `<DataGrid />`. Wrap the lookup:

```tsx
const activeTable = tables.find((t) => t.id === activeTableId) ?? null
```

And in the success branch render:

```tsx
<main className="rounded-lg border border-border bg-surface/40 p-3">
  {activeTable ? <DataGrid table={activeTable} /> : null}
</main>
```

Add import:

```ts
import { DataGrid } from './data-grid'
```

- [ ] **Step 4: Manual verify**

Run `npm run dev`. Visit `/datasets/ds_acred/explore`. Pick `holdings`. Expected:
- A table of rows renders.
- Currency columns are right-aligned and use mono font.
- Clicking a column header toggles sort (asc → desc → none) and the arrow indicator updates.
- Pagination buttons advance the page; row count text reflects the totals.

Run the visual-fix loop: screenshot, verify columns aren't crushed/overflowed, verify the row hover effect looks intentional. Iterate.

- [ ] **Step 5: Commit**

```bash
git add components/features/explore/data-grid.tsx \
        components/features/explore/empty-state.tsx \
        components/features/explore/dataset-explorer.tsx
git commit -m "feat(explore): paginated grid with sort and schema-driven columns"
```

---

## Task 14: Filter widgets and FilterPopover

**Files:**
- Create: `components/features/explore/filter-popover.tsx`
- Create: `components/features/explore/filter-widget-numeric.tsx`
- Create: `components/features/explore/filter-widget-enum.tsx`
- Create: `components/features/explore/filter-widget-date.tsx`
- Create: `components/features/explore/filter-widget-text.tsx`
- Create: `components/features/explore/filter-widget-boolean.tsx`
- Modify: `components/features/explore/data-grid.tsx`
- Modify: `components/features/explore/dataset-explorer.tsx`

- [ ] **Step 1: Lift filter state to DatasetExplorer**

Filter state belongs to `DatasetExplorer` because the toolbar (next task) needs it too. Update `dataset-explorer.tsx`:

```tsx
import { useReducer } from 'react'
import type { ColumnFilter, SortState } from '@/lib/data/types'

type ExplorerState = {
  activeTableId: string
  filters: ColumnFilter[]
  sort: SortState
}

type ExplorerAction =
  | { type: 'set-table'; id: string }
  | { type: 'set-sort'; sort: SortState }
  | { type: 'upsert-filter'; filter: ColumnFilter }
  | { type: 'remove-filter'; column: string }
  | { type: 'clear-filters' }

function reducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'set-table':
      return { activeTableId: action.id, filters: [], sort: null }
    case 'set-sort':
      return { ...state, sort: action.sort }
    case 'upsert-filter': {
      const others = state.filters.filter((f) => f.column !== action.filter.column)
      return { ...state, filters: [...others, action.filter] }
    }
    case 'remove-filter':
      return { ...state, filters: state.filters.filter((f) => f.column !== action.column) }
    case 'clear-filters':
      return { ...state, filters: [] }
  }
}
```

Replace the existing `useState` with `useReducer(reducer, { activeTableId: tables[0]?.id ?? '', filters: [], sort: null })`. Pass `state.filters`, `dispatch`, and `state.sort` down to `<DataGrid />`.

- [ ] **Step 2: Update DataGrid to accept lifted state**

Change DataGrid's props:

```ts
type Props = {
  table: TableDescriptor
  filters: ColumnFilter[]
  sort: SortState
  onChangeSort: (sort: SortState) => void
  onUpsertFilter: (filter: ColumnFilter) => void
  onRemoveFilter: (column: string) => void
  onClearFilters: () => void
  onFocusColumn?: (column: ResolvedColumn) => void
}
```

Remove the local `sort` state and `useState<SortState>` line. Read `sort` from props; call `onChangeSort` in `toggleSort`. Reset `page` to 0 when sort or filters change (use a `useEffect` on `JSON.stringify(filters)` and `sort` to reset page to 0).

Pass `filters` to `useTableQuery`. Show "no rows match filters" + a "Clear filters" button (calls `onClearFilters`) when `query.rows.length === 0 && filters.length > 0`.

- [ ] **Step 3: Numeric filter widget**

Create `components/features/explore/filter-widget-numeric.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { NumericFilter } from '@/lib/data/types'

type Props = {
  column: string
  initial: NumericFilter | undefined
  onApply: (filter: NumericFilter) => void
  onClear: () => void
}

export function FilterWidgetNumeric({ column, initial, onApply, onClear }: Props) {
  const [min, setMin] = useState(initial?.min?.toString() ?? '')
  const [max, setMax] = useState(initial?.max?.toString() ?? '')

  function apply() {
    const f: NumericFilter = { kind: 'numeric', column }
    if (min !== '') f.min = Number(min)
    if (max !== '') f.max = Number(max)
    onApply(f)
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
        <Input placeholder="Max" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
        <Button size="sm" onClick={apply}>Apply</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Enum, date, text, boolean widgets**

Follow the same pattern — small focused components. Use existing shadcn primitives:
- `filter-widget-enum.tsx`: `<Checkbox />` per known enum value (from descriptor's `enumValues`); if no enum values are declared, do a `SELECT DISTINCT col FROM table LIMIT 50` to populate (lazy fetch via `useDuckDB`).
- `filter-widget-date.tsx`: two `<Input type="date" />`.
- `filter-widget-text.tsx`: single `<Input />`, applied on blur or Apply click.
- `filter-widget-boolean.tsx`: three-state `<RadioGroup>` — Yes / No / Any.

Each widget exports a component named `FilterWidget<Kind>` taking `{ column, initial, onApply, onClear }`. Keep them under ~50 lines each.

- [ ] **Step 5: FilterPopover dispatch**

Create `components/features/explore/filter-popover.tsx`:

```tsx
'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ColumnFilter, ResolvedColumn } from '@/lib/data/types'
import { FilterWidgetNumeric } from './filter-widget-numeric'
import { FilterWidgetEnum } from './filter-widget-enum'
import { FilterWidgetDate } from './filter-widget-date'
import { FilterWidgetText } from './filter-widget-text'
import { FilterWidgetBoolean } from './filter-widget-boolean'

type Props = {
  column: ResolvedColumn
  current: ColumnFilter | undefined
  onApply: (filter: ColumnFilter) => void
  onClear: () => void
  children: React.ReactNode  // the trigger
}

const NUMERIC: ReadonlyArray<ResolvedColumn['format']> = ['currency', 'percent', 'bps', 'integer', 'decimal']

export function FilterPopover({ column, current, onApply, onClear, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {NUMERIC.includes(column.format) && (
          <FilterWidgetNumeric
            column={column.id}
            initial={current?.kind === 'numeric' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {column.format === 'enum' && (
          <FilterWidgetEnum
            column={column}
            initial={current?.kind === 'enum' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {(column.format === 'date' || column.format === 'datetime') && (
          <FilterWidgetDate
            column={column.id}
            initial={current?.kind === 'date' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {(column.format === 'text' || column.format === 'identifier') && (
          <FilterWidgetText
            column={column.id}
            initial={current?.kind === 'text' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {column.format === 'boolean' && (
          <FilterWidgetBoolean
            column={column.id}
            initial={current?.kind === 'boolean' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
```

- [ ] **Step 6: Wire FilterPopover into DataGrid column headers**

In `data-grid.tsx`, inside the `<th>` flex, after the sort button, add:

```tsx
{col && (
  <FilterPopover
    column={col}
    current={filters.find((f) => f.column === col.id)}
    onApply={(f) => onUpsertFilter(f)}
    onClear={() => onRemoveFilter(col.id)}
  >
    <button type="button" className="rounded p-1 text-xs text-muted-foreground hover:bg-accent" aria-label={`Filter ${col.label}`}>⌗</button>
  </FilterPopover>
)}
```

`onClear` dispatches a real removal so the filter chip disappears from the toolbar (added in Task 15) and the URL state (added in Task 18).

- [ ] **Step 7: Manual verify**

Run `npm run dev`. On the holdings table:
- Click the `⌗` icon on a currency column. Set min=1000. Apply. Row count drops, results reflect the filter.
- Click the icon on an enum column. Select two values. Apply. Row count drops further.
- Clear filters via the widget — rows return.

Run the visual-fix loop on the popover layout; common issues: popover too wide, buttons cramped, no padding.

- [ ] **Step 8: Commit**

```bash
git add components/features/explore/filter-*.tsx \
        components/features/explore/data-grid.tsx \
        components/features/explore/dataset-explorer.tsx
git commit -m "feat(explore): per-format filter widgets and FilterPopover"
```

---

## Task 15: ExploreToolbar with chips, row count, and CSV export

**Files:**
- Create: `components/features/explore/explore-toolbar.tsx`
- Modify: `components/features/explore/dataset-explorer.tsx`

- [ ] **Step 1: Toolbar with chips**

Create `components/features/explore/explore-toolbar.tsx`:

```tsx
'use client'

import type * as duckdb from '@duckdb/duckdb-wasm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fmtNumber } from '@/lib/format'
import type { ColumnFilter, ResolvedColumn, SortState } from '@/lib/data/types'
import { buildWhereClause } from '@/lib/data/filters'

type Props = {
  db: duckdb.AsyncDuckDB
  tableId: string
  columns: ResolvedColumn[]
  filters: ColumnFilter[]
  sort: SortState
  totalCount: number | null
  onRemoveFilter: (column: string) => void
  onClearFilters: () => void
}

export function ExploreToolbar({ db, tableId, columns, filters, sort, totalCount, onRemoveFilter, onClearFilters }: Props) {
  async function exportCSV() {
    const { sql: where, params } = buildWhereClause(filters)
    const orderBy = sort ? `ORDER BY "${sort.column.replace(/"/g, '""')}" ${sort.dir.toUpperCase()}` : ''
    const sql = `SELECT * FROM "${tableId}" ${where} ${orderBy}`
    const conn = await db.connect()
    try {
      const stmt = await conn.prepare(sql)
      const result = await stmt.query(...params)
      const colNames = result.schema.fields.map((f) => f.name)
      const rows = result.toArray().map((r) => r.toJSON() as Record<string, unknown>)
      const csv = [
        colNames.map(csvCell).join(','),
        ...rows.map((row) => colNames.map((c) => csvCell(row[c])).join(',')),
      ].join('\n')
      await stmt.close()

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tableId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      await conn.close()
    }
  }

  function labelFor(columnId: string): string {
    return columns.find((c) => c.id === columnId)?.label ?? columnId
  }

  function chipText(f: ColumnFilter): string {
    const name = labelFor(f.column)
    if (f.kind === 'numeric') {
      const parts: string[] = []
      if (f.min !== undefined) parts.push(`≥ ${f.min}`)
      if (f.max !== undefined) parts.push(`≤ ${f.max}`)
      return parts.length ? `${name}: ${parts.join(' · ')}` : name
    }
    if (f.kind === 'enum') return f.values.length ? `${name}: ${f.values.join(', ')}` : name
    if (f.kind === 'date') {
      const parts: string[] = []
      if (f.fromISO) parts.push(`≥ ${f.fromISO}`)
      if (f.toISO) parts.push(`≤ ${f.toISO}`)
      return parts.length ? `${name}: ${parts.join(' · ')}` : name
    }
    if (f.kind === 'text') return f.contains ? `${name} ~ "${f.contains}"` : name
    return `${name}: ${f.value === true ? 'Yes' : f.value === false ? 'No' : 'Any'}`
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-1 text-sm">
      <span className="font-mono text-xs text-muted-foreground">
        {totalCount == null ? '—' : `${fmtNumber(totalCount)} rows`}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {filters.map((f) => (
          <Badge key={f.column} variant="outline" className="gap-1 font-normal">
            <span>{chipText(f)}</span>
            <button type="button" aria-label={`Remove filter ${labelFor(f.column)}`} onClick={() => onRemoveFilter(f.column)} className="hover:text-foreground">×</button>
          </Badge>
        ))}
        {filters.length > 1 && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>Clear all</Button>
        )}
      </div>
      <Button size="sm" variant="outline" className="ml-auto" onClick={exportCSV}>Export CSV</Button>
    </div>
  )
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s = typeof v === 'string' ? v : (typeof v === 'bigint' ? v.toString() : JSON.stringify(v))
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
```

- [ ] **Step 2: Wire toolbar into DatasetExplorer**

DataGrid needs to expose `totalCount` and `columns` to the toolbar. Simplest: lift both up via a callback `onMetrics({ totalCount, columns })` from DataGrid, store in DatasetExplorer's state. Add to the reducer:

```ts
type ExplorerState = {
  activeTableId: string
  filters: ColumnFilter[]
  sort: SortState
  totalCount: number | null
  columns: ResolvedColumn[]
}

// Add cases:
| { type: 'set-metrics'; totalCount: number; columns: ResolvedColumn[] }
```

In DataGrid, after `query.ready` becomes true, fire `onMetrics({ totalCount: query.totalCount, columns: schema.columns })` via a `useEffect`.

In DatasetExplorer, render the toolbar above the grid:

```tsx
<main className="grid gap-2">
  <ExploreToolbar
    db={db}
    tableId={state.activeTableId}
    columns={state.columns}
    filters={state.filters}
    sort={state.sort}
    totalCount={state.totalCount}
    onRemoveFilter={(c) => dispatch({ type: 'remove-filter', column: c })}
    onClearFilters={() => dispatch({ type: 'clear-filters' })}
  />
  {activeTable && (
    <DataGrid
      table={activeTable}
      filters={state.filters}
      sort={state.sort}
      onChangeSort={(s) => dispatch({ type: 'set-sort', sort: s })}
      onUpsertFilter={(f) => dispatch({ type: 'upsert-filter', filter: f })}
      onRemoveFilter={(c) => dispatch({ type: 'remove-filter', column: c })}
      onClearFilters={() => dispatch({ type: 'clear-filters' })}
      onMetrics={(m) => dispatch({ type: 'set-metrics', totalCount: m.totalCount, columns: m.columns })}
    />
  )}
</main>
```

- [ ] **Step 3: Manual verify**

Run `npm run dev`:
- Add a filter via a column popover. A chip appears in the toolbar.
- Click the × on the chip; chip disappears, rows return.
- Click "Export CSV". A `holdings.csv` (or whichever table) downloads. Open it; confirm columns and row count match.

Run the visual-fix loop. Check: chips don't wrap awkwardly; "Export CSV" stays right-aligned; row count format uses Geist Mono.

- [ ] **Step 4: Commit**

```bash
git add components/features/explore/explore-toolbar.tsx \
        components/features/explore/data-grid.tsx \
        components/features/explore/dataset-explorer.tsx
git commit -m "feat(explore): toolbar with filter chips, row count, and CSV export"
```

---

## Task 16: Column profile (useColumnProfile + charts + panel)

**Files:**
- Create: `lib/data/use-column-profile.ts`
- Create: `components/features/explore/profile-chart-histogram.tsx`
- Create: `components/features/explore/profile-chart-categorical.tsx`
- Create: `components/features/explore/profile-chart-timeline.tsx`
- Create: `components/features/explore/column-profile-panel.tsx`
- Modify: `components/features/explore/dataset-explorer.tsx`
- Modify: `components/features/explore/data-grid.tsx`

- [ ] **Step 1: useColumnProfile hook**

Create `lib/data/use-column-profile.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'
import { useDuckDB } from './use-duckdb'
import { buildWhereClause } from './filters'
import type { ColumnFilter, Format, ResolvedColumn } from './types'

export type ColumnProfile =
  | { kind: 'numeric'; bins: { x0: number; x1: number; count: number }[]; min: number; max: number; nullCount: number; distinct: number }
  | { kind: 'categorical'; top: { value: string; count: number }[]; otherCount: number; nullCount: number; distinct: number }
  | { kind: 'timeline'; buckets: { monthISO: string; count: number }[]; nullCount: number; distinct: number }
  | { kind: 'simple'; nullCount: number; distinct: number; topValue: string | null }

type ProfileState =
  | { ready: false; profile: null; error: null }
  | { ready: false; profile: null; error: Error }
  | { ready: true; profile: ColumnProfile; error: null }

const NUMERIC: ReadonlyArray<Format> = ['currency', 'percent', 'bps', 'integer', 'decimal']

export function useColumnProfile(
  tableId: string | null,
  column: ResolvedColumn | null,
  filters: ColumnFilter[],
): ProfileState {
  const { db, ready } = useDuckDB()
  const [state, setState] = useState<ProfileState>({ ready: false, profile: null, error: null })

  useEffect(() => {
    if (!ready || !db || !tableId || !column) return
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      try {
        const { sql: where, params } = buildWhereClause(filters)
        const id = `"${column.id.replace(/"/g, '""')}"`
        const base = `FROM "${tableId}" ${where}`

        const summaryStmt = await conn.prepare(`SELECT COUNT(*)::BIGINT AS total, COUNT(${id})::BIGINT AS non_null, COUNT(DISTINCT ${id})::BIGINT AS distinct ${base}`)
        const summary = (await summaryStmt.query(...params)).toArray()[0] as unknown as { total: bigint; non_null: bigint; distinct: bigint }
        await summaryStmt.close()
        const total = Number(summary.total)
        const distinct = Number(summary.distinct)
        const nullCount = total - Number(summary.non_null)

        if (NUMERIC.includes(column.format)) {
          const statsStmt = await conn.prepare(`SELECT MIN(${id})::DOUBLE AS mn, MAX(${id})::DOUBLE AS mx ${base}`)
          const { mn, mx } = (await statsStmt.query(...params)).toArray()[0] as unknown as { mn: number; mx: number }
          await statsStmt.close()
          if (mn == null || mx == null || mn === mx) {
            if (!cancelled) setState({ ready: true, profile: { kind: 'numeric', bins: [], min: mn ?? 0, max: mx ?? 0, nullCount, distinct }, error: null })
          } else {
            const N = 20
            const histStmt = await conn.prepare(
              `SELECT bucket, COUNT(*)::BIGINT AS c FROM (
                  SELECT WIDTH_BUCKET(${id}, ?, ?, ?) AS bucket ${base.replace('FROM', 'FROM ').replace(/\s+/, ' ')}
                ) GROUP BY bucket ORDER BY bucket`
            )
            const histResult = await histStmt.query(mn, mx, N, ...params)
            const rows = histResult.toArray().map((r) => r.toJSON() as unknown as { bucket: number; c: bigint })
            await histStmt.close()
            const width = (mx - mn) / N
            const bins = rows.filter((r) => r.bucket >= 1 && r.bucket <= N).map((r) => ({
              x0: mn + (r.bucket - 1) * width,
              x1: mn + r.bucket * width,
              count: Number(r.c),
            }))
            if (!cancelled) setState({ ready: true, profile: { kind: 'numeric', bins, min: mn, max: mx, nullCount, distinct }, error: null })
          }
        } else if (column.format === 'enum' || (column.format === 'text' && distinct <= 50)) {
          const topStmt = await conn.prepare(`SELECT ${id} AS v, COUNT(*)::BIGINT AS c ${base} GROUP BY v ORDER BY c DESC LIMIT 10`)
          const topRows = (await topStmt.query(...params)).toArray().map((r) => r.toJSON() as unknown as { v: string; c: bigint })
          await topStmt.close()
          const topShown = topRows.map((r) => ({ value: String(r.v), count: Number(r.c) }))
          const otherCount = total - topShown.reduce((s, x) => s + x.count, 0) - nullCount
          if (!cancelled) setState({ ready: true, profile: { kind: 'categorical', top: topShown, otherCount, nullCount, distinct }, error: null })
        } else if (column.format === 'date' || column.format === 'datetime') {
          const tlStmt = await conn.prepare(`SELECT strftime(date_trunc('month', ${id}), '%Y-%m-01') AS monthISO, COUNT(*)::BIGINT AS c ${base} GROUP BY monthISO ORDER BY monthISO`)
          const tlRows = (await tlStmt.query(...params)).toArray().map((r) => r.toJSON() as unknown as { monthISO: string; c: bigint })
          await tlStmt.close()
          if (!cancelled) setState({ ready: true, profile: { kind: 'timeline', buckets: tlRows.map((r) => ({ monthISO: r.monthISO, count: Number(r.c) })), nullCount, distinct }, error: null })
        } else {
          // identifier / high-cardinality text / boolean
          const topStmt = await conn.prepare(`SELECT ${id} AS v ${base} WHERE ${id} IS NOT NULL GROUP BY v ORDER BY COUNT(*) DESC LIMIT 1`)
          const top = (await topStmt.query(...params)).toArray().map((r) => r.toJSON() as unknown as { v: string })[0]
          await topStmt.close()
          if (!cancelled) setState({ ready: true, profile: { kind: 'simple', nullCount, distinct, topValue: top ? String(top.v) : null }, error: null })
        }
      } catch (err: unknown) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, profile: null, error })
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, ready, tableId, column, JSON.stringify(filters)])

  return state
}
```

Note: the histogram SQL embeds `WIDTH_BUCKET(col, mn, mx, N)`. The exact subquery syntax depends on DuckDB-WASM accepting parameter binding inside `WIDTH_BUCKET`. If `prepare` rejects the binding, fall back to interpolating `mn`/`mx`/`N` into the SQL string (they're numerics, not user input — safe) while keeping `params` for the WHERE clause. Verify in the browser console; iterate if it errors.

- [ ] **Step 2: Chart components**

Create three small components, each using Recharts. Keep each under 50 lines.

`profile-chart-histogram.tsx` — `<BarChart>` with x-axis as bin midpoints, y-axis as counts:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Props = { bins: { x0: number; x1: number; count: number }[]; formatTick: (v: number) => string }

export function ProfileChartHistogram({ bins, formatTick }: Props) {
  const data = bins.map((b) => ({ mid: (b.x0 + b.x1) / 2, count: b.count, x0: b.x0, x1: b.x1 }))
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="mid" tickFormatter={formatTick} tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip
            formatter={(v: number) => [v, 'count']}
            labelFormatter={(v: number) => formatTick(v)}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

`profile-chart-categorical.tsx` — horizontal bar, top 10:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Props = { top: { value: string; count: number }[] }

export function ProfileChartCategorical({ top }: Props) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer>
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="value" tick={{ fontSize: 10 }} width={80} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

`profile-chart-timeline.tsx` — months on x, count on y:

```tsx
'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Props = { buckets: { monthISO: string; count: number }[] }

export function ProfileChartTimeline({ buckets }: Props) {
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <BarChart data={buckets} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="monthISO" tickFormatter={(d: string) => d.slice(0, 7)} tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: ColumnProfilePanel**

Create `components/features/explore/column-profile-panel.tsx`:

```tsx
'use client'

import { fmtNumber } from '@/lib/format'
import { formatValue } from '@/lib/data/format'
import type { ColumnFilter, ResolvedColumn } from '@/lib/data/types'
import { useColumnProfile } from '@/lib/data/use-column-profile'
import { ProfileChartHistogram } from './profile-chart-histogram'
import { ProfileChartCategorical } from './profile-chart-categorical'
import { ProfileChartTimeline } from './profile-chart-timeline'

type Props = {
  tableId: string
  column: ResolvedColumn | null
  filters: ColumnFilter[]
}

export function ColumnProfilePanel({ tableId, column, filters }: Props) {
  const state = useColumnProfile(tableId, column, filters)

  return (
    <aside className="grid gap-3 rounded-lg border border-border bg-surface/40 p-3 text-sm md:block">
      {!column ? (
        <p className="text-muted-foreground">Select a column to profile.</p>
      ) : (
        <>
          <div>
            <div className="font-medium">{column.label}</div>
            <div className="font-mono text-xs text-muted-foreground">{column.duckdbType} · {column.format}</div>
            {column.description && <p className="mt-1 text-xs text-muted-foreground">{column.description}</p>}
          </div>

          {!state.ready ? (
            <p className="text-xs text-muted-foreground">{state.error ? `Error: ${state.error.message}` : 'Profiling…'}</p>
          ) : (
            <>
              <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Distinct</dt>
                <dd className="font-mono">{fmtNumber(state.profile.distinct)}</dd>
                <dt className="text-muted-foreground">Nulls</dt>
                <dd className="font-mono">{fmtNumber(state.profile.nullCount)}</dd>
                {state.profile.kind === 'numeric' && (
                  <>
                    <dt className="text-muted-foreground">Min</dt>
                    <dd className="font-mono">{formatValue(state.profile.min, column)}</dd>
                    <dt className="text-muted-foreground">Max</dt>
                    <dd className="font-mono">{formatValue(state.profile.max, column)}</dd>
                  </>
                )}
              </dl>
              {state.profile.kind === 'numeric' && state.profile.bins.length > 0 && (
                <ProfileChartHistogram bins={state.profile.bins} formatTick={(v) => formatValue(v, column)} />
              )}
              {state.profile.kind === 'categorical' && (
                <ProfileChartCategorical top={state.profile.top} />
              )}
              {state.profile.kind === 'timeline' && state.profile.buckets.length > 0 && (
                <ProfileChartTimeline buckets={state.profile.buckets} />
              )}
              {state.profile.kind === 'simple' && state.profile.topValue && (
                <p className="text-xs text-muted-foreground">Most common: <span className="font-mono">{state.profile.topValue}</span></p>
              )}
            </>
          )}
        </>
      )}
    </aside>
  )
}
```

- [ ] **Step 4: Wire profile panel into DatasetExplorer**

Extend the reducer to track a focused column.

In `dataset-explorer.tsx`, update the state and action types:

```ts
type ExplorerState = {
  activeTableId: string
  filters: ColumnFilter[]
  sort: SortState
  totalCount: number | null
  columns: ResolvedColumn[]
  focusedColumn: ResolvedColumn | null
}

type ExplorerAction =
  | { type: 'set-table'; id: string }
  | { type: 'set-sort'; sort: SortState }
  | { type: 'upsert-filter'; filter: ColumnFilter }
  | { type: 'remove-filter'; column: string }
  | { type: 'clear-filters' }
  | { type: 'set-metrics'; totalCount: number; columns: ResolvedColumn[] }
  | { type: 'set-focused-column'; column: ResolvedColumn }
```

Add cases to the reducer:

```ts
case 'set-focused-column':
  return { ...state, focusedColumn: action.column }
case 'set-metrics': {
  // Default focused column to primary key the first time we get metrics for this table.
  const pkCol = action.columns.find((c) => c.id === activeTablePK(state.activeTableId, tables)) ?? action.columns[0] ?? null
  const focusedColumn = state.focusedColumn && action.columns.some((c) => c.id === state.focusedColumn!.id)
    ? state.focusedColumn
    : pkCol
  return { ...state, totalCount: action.totalCount, columns: action.columns, focusedColumn }
}
```

And a helper outside the component:

```ts
function activeTablePK(tableId: string, tables: TableDescriptor[]): string | undefined {
  return tables.find((t) => t.id === tableId)?.primaryKey
}
```

The `set-table` case should reset `focusedColumn` to null (so the next `set-metrics` re-defaults it):

```ts
case 'set-table':
  return { activeTableId: action.id, filters: [], sort: null, totalCount: null, columns: [], focusedColumn: null }
```

Pass `onFocusColumn={(c) => dispatch({ type: 'set-focused-column', column: c })}` to `<DataGrid />`. Replace the right-pane placeholder with:

```tsx
<ColumnProfilePanel tableId={state.activeTableId} column={state.focusedColumn} filters={state.filters} />
```

The reducer-as-closure captures `tables` via the helper, so it stays pure.

- [ ] **Step 5: Manual verify**

Run `npm run dev`:
- Open ACRED Explore, pick holdings.
- The right panel shows the primary key column's profile.
- Click the `⌕` icon on a currency column header → right panel updates to that column, histogram renders.
- Click the icon on an enum column → categorical bar chart.
- Click on a date column → timeline.
- Apply a filter from the toolbar; profile updates (debounced).

Run the visual-fix loop. Common issues: chart fonts too big, Y-axis ticks colliding, bar color contrast.

- [ ] **Step 6: Commit**

```bash
git add lib/data/use-column-profile.ts \
        components/features/explore/profile-chart-*.tsx \
        components/features/explore/column-profile-panel.tsx \
        components/features/explore/dataset-explorer.tsx \
        components/features/explore/data-grid.tsx
git commit -m "feat(explore): column profile panel with type-specific charts"
```

---

## Task 17: Error state component + polish

**Files:**
- Create: `components/features/explore/error-state.tsx`
- Modify: `components/features/explore/dataset-explorer.tsx`
- Modify: `components/features/explore/data-grid.tsx`

- [ ] **Step 1: ErrorState component**

Create `components/features/explore/error-state.tsx`:

```tsx
'use client'

import { Button } from '@/components/ui/button'

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="grid h-[40vh] place-items-center gap-3 text-center">
      <p className="text-sm text-destructive">{message}</p>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  )
}
```

- [ ] **Step 2: Use ErrorState in the explorer**

Replace ad-hoc error renderings in `dataset-explorer.tsx` and `data-grid.tsx` with `<ErrorState message=... onRetry=... />`. For the DuckDB init failure path, retry can reload the page or call `__resetDBForTests` followed by a setState trigger — pragmatic choice is `location.reload()`.

- [ ] **Step 3: Empty-with-filters state**

In `data-grid.tsx`, when `query.rows.length === 0 && filters.length > 0`, render:

```tsx
<EmptyState
  message="No rows match these filters."
  action={<Button variant="outline" size="sm" onClick={onClearFilters}>Clear filters</Button>}
/>
```

Add `onClearFilters` to DataGrid props and pass it from DatasetExplorer.

- [ ] **Step 4: Visual loop**

Run the visual-fix loop on the full explorer page in three states:
1. Loading
2. Empty (apply a contradictory filter set, e.g. `min=999999999`)
3. Error (temporarily break a parquet URL — rename the file in `public/structured/` and reload)

Restore anything you broke before continuing.

- [ ] **Step 5: Commit**

```bash
git add components/features/explore/error-state.tsx \
        components/features/explore/data-grid.tsx \
        components/features/explore/dataset-explorer.tsx
git commit -m "feat(explore): error state + empty-with-filters polish"
```

---

## Task 18: URL state persistence (filters + sort + table in searchParams)

**Files:**
- Modify: `components/features/explore/dataset-explorer.tsx`

- [ ] **Step 1: Read initial state from URL**

In `dataset-explorer.tsx`, replace the `useReducer` initial state with one derived from `useSearchParams()`:

```tsx
'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { encodeFilterState, decodeFilterState } from '@/lib/data/filters'

// ...inside DatasetExplorer:
const search = useSearchParams()
const router = useRouter()
const pathname = usePathname()

const initialState: ExplorerState = (() => {
  const encoded = search.get('f')
  if (encoded) {
    const decoded = decodeFilterState(encoded)
    if (decoded && tables.some((t) => t.id === decoded.table)) {
      return {
        activeTableId: decoded.table,
        filters: decoded.filters,
        sort: decoded.sort,
        totalCount: null,
        columns: [],
        focusedColumn: null,
      }
    }
  }
  return {
    activeTableId: tables[0]?.id ?? '',
    filters: [],
    sort: null,
    totalCount: null,
    columns: [],
    focusedColumn: null,
  }
})()
```

- [ ] **Step 2: Sync state changes back to the URL**

Add a `useEffect` that runs on changes to `state.activeTableId`, `state.filters`, `state.sort`:

```tsx
useEffect(() => {
  const encoded = encodeFilterState({
    table: state.activeTableId,
    filters: state.filters,
    sort: state.sort,
  })
  const params = new URLSearchParams(search.toString())
  if (state.filters.length === 0 && !state.sort && state.activeTableId === tables[0]?.id) {
    params.delete('f')
  } else {
    params.set('f', encoded)
  }
  router.replace(`${pathname}?${params.toString()}`, { scroll: false })
}, [state.activeTableId, state.filters, state.sort, pathname, router, search, tables])
```

- [ ] **Step 3: Manual verify**

Run `npm run dev`. Apply some filters and a sort. Copy the URL. Open in a new tab — same view restores. Refresh — same view. Remove all filters — URL drops the `?f=` param.

- [ ] **Step 4: Commit**

```bash
git add components/features/explore/dataset-explorer.tsx
git commit -m "feat(explore): persist table/filters/sort to URL search params"
```

---

## Task 19: E2E spec

**Files:**
- Create: `tests/e2e/explore-acred.spec.ts`

- [ ] **Step 1: Write the spec**

Create `tests/e2e/explore-acred.spec.ts`:

```ts
import { test, expect } from '@playwright/test'

test('explore: ACRED is discoverable, queryable, and exportable', async ({ page }) => {
  // Capture console messages so we can assert on descriptor drift.
  const warnings: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'warning') warnings.push(msg.text())
  })

  await page.goto('/login')
  await page.getByRole('button', { name: /demo/i }).first().click()

  // Land in the app shell, navigate to ACRED.
  await page.goto('/datasets/ds_acred')
  await expect(page.getByRole('heading', { name: /ACRED/i })).toBeVisible()

  // Explore tab exists and navigates.
  const exploreLink = page.getByRole('link', { name: /^Explore$/ })
  await expect(exploreLink).toBeVisible()
  await exploreLink.click()
  await expect(page).toHaveURL(/\/datasets\/ds_acred\/explore/)

  // Pick holdings.
  await page.getByRole('button', { name: /^Holdings/i }).click()

  // Wait for the grid to populate.
  await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15_000 })
  const firstRowCount = await page.locator('table tbody tr').count()
  expect(firstRowCount).toBeGreaterThan(0)

  // Sort by clicking the first sortable header twice (asc → desc).
  const firstHeaderButton = page.locator('table thead button').first()
  await firstHeaderButton.click()
  await firstHeaderButton.click()

  // Open a filter popover and apply a numeric range that excludes most rows.
  const firstFilterButton = page.locator('table thead button[aria-label^="Filter"]').first()
  await firstFilterButton.click()
  const minInput = page.getByPlaceholder('Min')
  if (await minInput.isVisible()) {
    await minInput.fill('999999999')
    await page.getByRole('button', { name: /^Apply$/ }).click()
    await expect(page.getByText(/No rows match these filters/i)).toBeVisible()
    await page.getByRole('button', { name: /^Clear filters$/ }).click()
  }

  // Focus a column for profile — click the ⌕ button on the first column.
  await page.locator('table thead button[aria-label^="Focus column"]').first().click()
  await expect(page.locator('aside').filter({ hasText: /Distinct/i })).toBeVisible()

  // CSV export.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export CSV/i }).click(),
  ])
  expect(download.suggestedFilename()).toMatch(/holdings\.csv$/)

  // Descriptor drift guard: no [descriptor-drift] warnings during the whole run.
  expect(warnings.filter((w) => w.includes('[descriptor-drift]'))).toHaveLength(0)
})
```

- [ ] **Step 2: Run it**

Run:
```bash
npm run test:e2e -- explore-acred
```

Expected: PASS. If selectors don't match, adjust them to match what you actually rendered (the spec's selectors mirror the markup from Tasks 12–17 — divergence is a sign of UI drift between plan and reality, which is fine to reconcile here).

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/explore-acred.spec.ts
git commit -m "test(e2e): ACRED explore happy path + descriptor drift guard"
```

---

## Task 20: Final pass — typecheck, lint, full test run

**Files:** (none — verification only)

- [ ] **Step 1: Run full verification**

Run, in this order, and fix anything that comes up:

```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

`npm run build` is the canary for bundle/worker issues. If it fails on the DuckDB-WASM worker (e.g. missing `?url` resolver), update `next.config.ts` to add WASM/worker handling. The common fix is none — Next 16 handles `import.meta.url` URL imports out of the box — but if the build complains, search for the error verbatim in the DuckDB-WASM GitHub issues; the fixes are well-known.

- [ ] **Step 2: Open the route in production mode**

Run:
```bash
npm run build && npm start
```

Visit `/datasets/ds_acred/explore`. The cold load should still resolve and behave identically to dev. Anything that worked in dev but breaks in prod is almost certainly a worker/asset path issue — investigate.

- [ ] **Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "chore(explore): fix prod build / lint issues"
```

(Skip the commit if there are no changes.)

---

## Out-of-scope reminders

These were deliberately deferred per the spec and should NOT be tackled inside this plan. If you find yourself wanting to do them, stop and flag:

- SQL editor surface inside the Explore tab.
- Wiring DuckDB into notebook query cells.
- Live-binding Schema / Lineage / Runs tabs to the parquet metadata.
- Cross-table joins, row-detail drawer, saved-view bookmarks, visual join builder.
- Server-side parquet I/O.

A follow-up plan can pick these up after this one ships.
