# ACRED Explore Tab — Design

**Date:** 2026-05-11
**Status:** Approved (brainstorming)
**Owner:** @electricddev

## Goal

Surface the five ACRED parquet files in `public/structured/` as a queryable, explorable, standardized data view inside the existing Datasets feature. DuckDB-WASM is the in-browser query engine; SQL is hidden from the user. The exploration UI is a new tab on the dataset detail page, available only for parquet-backed datasets.

## Non-goals

- Exposing a SQL editor in the Explore tab (DuckDB stays under the hood).
- Wiring DuckDB into notebook query cells. That stays a follow-up; the `lib/data/` layer is designed to be reusable when we do.
- Live-binding the Schema / Lineage / Runs tabs to the parquet schemas. Those tabs continue to render the existing mock content for ACRED in this iteration. Worth flagging in the implementation PR.
- Cross-table joins, saved views, row-detail drawer, or visual join builder (Approach C extras, deferred).
- Server-side data access. All parquet I/O is browser-side via DuckDB-WASM httpfs against `/structured/*.parquet`.

## Audience and naming

ACRED is modeled as one dataset (`ds_acred`) with five tables (`borrowers`, `holdings`, `concentration_metrics`, `credit_events`, `fund_overview`). Originator org is a new `org_apollo` fixture (existing fixtures are clearly mock; ACRED is real, so it gets a recognizable parent). Asset class: `private-credit`.

## Architecture

### Engine

- Package: `@duckdb/duckdb-wasm`.
- Singleton instance per tab session, held in a module-level cache inside `lib/data/duckdb.ts`. Idempotent initializer.
- MVP build (no SIMD). WASM and worker assets resolved via Next.js `new URL('...', import.meta.url)` so they're hashed with the rest of the bundle. No external CDN.
- DuckDB lives on the client only. The Explore tab is a client component subtree under a thin server page.

### Parquet loading

- Files stay in `public/structured/`. On first init, `db.registerFileURL` registers each ACRED parquet by name, then five `CREATE VIEW` statements expose them as tables: `borrowers`, `holdings`, `concentration_metrics`, `credit_events`, `fund_overview`.
- DuckDB streams bytes on demand via httpfs; given total size ~536KB, data caches in memory after the first scan.
- No IndexedDB persistence — corpus is small, cold-load is fast enough, and persistence would add cache-staleness logic for no real win.

### Query layer

Three primitive hooks in `lib/data/`:

- `useDuckDB()` → `{ db, ready, error }`. Idempotent across mounts.
- `useTableSchema(tableId)` → runs `DESCRIBE` once per table, merges DuckDB types with the curated descriptor, returns `ResolvedColumn[]`.
- `useTableQuery({ tableId, filters, sort, limit, offset })` → composes parameterized SQL, runs it, returns `{ rows, totalCount, ready, error }`. Arrow batches converted to row objects at the boundary.

### Stats layer

- `useColumnProfile(tableId, columnId)` runs a single grouped query per column type:
  - numeric (currency / percent / bps / integer / decimal) → histogram via `width_bucket`
  - enum / low-cardinality text → top-N `GROUP BY`
  - date / datetime → monthly bucket bar
  - identifier / high-cardinality text → just `count(distinct)` + top single value (no chart)
- Memoized by `{ tableId, columnId, filterHash }`. Recomputes only when active filters change.

### Filter state and URL serialization

- Filter state lives in the client root via `useReducer`.
- Encoded into `searchParams` so views are shareable: `?table=holdings&f=<base64-compact-json>`.
- 200ms debounce on filter changes before re-running queries.

## Routing

- New route: `app/(app)/datasets/[datasetId]/explore/page.tsx`.
  - Server component. Resolves the dataset, calls `notFound()` if `dataset.tables` is unset, looks up curated descriptors via the registry, renders `<DatasetExplorer datasetId tables />` (client).
- `loading.tsx` next to it renders the three-pane skeleton during route segment load.
- `app/(app)/datasets/[datasetId]/layout.tsx` becomes dataset-aware: the `TABS` list is derived from the resolved dataset. When `dataset.tables` is present, an `Explore` tab is prepended (immediately after Overview).

### Dataset model change

Add an optional field to the `Dataset` type:

```ts
tables?: { id: string }[]
```

Presence of `tables` is the signal that:
1. The dataset is parquet-backed and has an Explore tab.
2. Curated descriptors exist in `lib/data/registry.ts` keyed by dataset id.

The full descriptors (labels, formats, etc.) are not on the fixture — they live in `lib/data/<dataset>/tables.ts`. The fixture just lists the table ids so the layout can be derived without touching the registry.

### Fixture additions

- `lib/api/fixtures/datasets.ts`: append `ds_acred` with `assetClass: 'private-credit'`, `originatorOrgId: 'org_apollo'`, `tables: [{ id: 'borrowers' }, { id: 'holdings' }, { id: 'concentration_metrics' }, { id: 'credit_events' }, { id: 'fund_overview' }]`. Other fields (record count, completeness, attestation, etc.) follow the existing fixture style.
- `lib/api/fixtures/orgs.ts`: add `org_apollo`.

## Standardized rendering — curated descriptors

The lever that makes "standardized UI" possible. One descriptor file per parquet-backed dataset: `lib/data/acred/tables.ts`.

### Descriptor shape

```ts
type Format =
  | 'currency' | 'percent' | 'bps'
  | 'integer' | 'decimal'
  | 'date' | 'datetime'
  | 'identifier' | 'enum' | 'text' | 'boolean'

type ColumnDescriptor = {
  id: string                           // parquet column name
  label: string                        // "ARR balance"
  description?: string                 // tooltip
  format: Format
  unit?: string                        // "USD", "bps"
  precision?: number                   // decimals
  enumValues?: Record<string, { tone: 'success' | 'warning' | 'danger' | 'neutral'; label?: string }>
  hidden?: boolean
}

type TableDescriptor = {
  id: string                           // parquet table name (== view name)
  label: string                        // "Borrowers"
  description: string
  primaryKey: string
  defaultSort?: { column: string; dir: 'asc' | 'desc' }
  columns: ColumnDescriptor[]
}
```

### Schema merge

`useTableSchema(tableId)` runs `DESCRIBE table` once, then overlays the descriptor:

- Column in DuckDB and descriptor → use descriptor for label/format/etc., DuckDB type kept for the SQL builder.
- Column in DuckDB only → render with `label = column name`, `format` inferred from the DuckDB type via this table:

  | DuckDB type                           | Inferred format |
  |---------------------------------------|-----------------|
  | `BOOLEAN`                             | `boolean`       |
  | `TINYINT` / `SMALLINT` / `INTEGER` / `BIGINT` / `HUGEINT` | `integer` |
  | `FLOAT` / `DOUBLE` / `DECIMAL(*,*)`   | `decimal`       |
  | `DATE`                                | `date`          |
  | `TIMESTAMP` / `TIMESTAMP WITH TIME ZONE` | `datetime`   |
  | `VARCHAR` / other                     | `text`          |

  Inference never produces `currency`, `percent`, `bps`, `identifier`, or `enum` — those are intentional curation. A column rendering as plain `decimal` or `text` is the cue to a developer that the descriptor should be filled in.
- Column in descriptor only → developer error. A Vitest test boots DuckDB in Node, runs `DESCRIBE` against each parquet, and asserts the descriptor matches. CI fails on drift.

### One renderer, three mirrored axes

Everything downstream keys off the `format` union — no per-column code paths.

- `lib/data/format-cell.tsx` exports `<Cell value column />`. Single function maps `(value, format)` to ReactNode. Currency aligns right, mono font. Identifiers use mono + click-to-copy. Enums render as `<Badge>` with the descriptor's tone. Nulls render as `—` (text-muted-foreground).
- Filter widgets mirror the same axis:
  - currency / percent / bps / integer / decimal → numeric range (two inputs + slider)
  - enum → multi-select chips
  - date / datetime → date range picker
  - identifier / text → substring search
  - boolean → tri-state toggle
- Profile chart mirrors the same axis:
  - numeric formats → Recharts histogram
  - enum → top-N horizontal bar
  - date → monthly bucket timeline
  - identifier / high-cardinality text → no chart, count + top value only

## Components and file layout

```
lib/data/
  duckdb.ts                 singleton init, registerFileURL, db handle
  use-duckdb.ts             hook: { db, ready, error }
  use-table-schema.ts       DESCRIBE + descriptor merge
  use-table-query.ts        paged rows + total count
  use-column-profile.ts     stats + chart data per column
  format-cell.tsx           <Cell value column /> renderer
  format.ts                 currency / percent / date formatters
  filters.ts                FilterState type, SQL builder, URL ser/de
  registry.ts               getTablesForDataset(datasetId)
  types.ts                  TableDescriptor, ColumnDescriptor, Format
  acred/
    tables.ts               ACRED descriptors

components/features/explore/
  dataset-explorer.tsx      client root, owns filter state, layout
  table-picker.tsx          left rail, list of tables with row counts
  explore-toolbar.tsx       filter chips + row count + CSV export
  data-grid.tsx             TanStack Table + Virtual, sort headers, pagination
  column-profile-panel.tsx  right panel, summary stats + mini chart
  filter-popover.tsx        popover from column header
  filter-widget-numeric.tsx
  filter-widget-enum.tsx
  filter-widget-date.tsx
  filter-widget-text.tsx
  filter-widget-boolean.tsx
  profile-chart-histogram.tsx
  profile-chart-categorical.tsx
  profile-chart-timeline.tsx
  empty-state.tsx
  loading-state.tsx
  error-state.tsx

app/(app)/datasets/[datasetId]/explore/
  page.tsx                  server: gates on dataset.tables, renders <DatasetExplorer />
  loading.tsx               route segment skeleton

lib/api/fixtures/datasets.ts   +ds_acred
lib/api/fixtures/orgs.ts       +org_apollo
app/(app)/datasets/[datasetId]/layout.tsx   tabs derived from dataset
```

### Layout

Three-pane on desktop, stack on small screens:

- Left rail (240px): `<TablePicker />`. Lists the 5 tables with row counts; current selection highlighted.
- Center (fluid): `<ExploreToolbar />` on top (active filter chips + row count + CSV export), then `<DataGrid />` below.
- Right (320px, collapsible): `<ColumnProfilePanel />` for the focused column. Defaults to the primary key. Set by clicking a column header label (separate from the sort/filter affordances).

### Interactions

Column header anatomy (left to right): `[label] [sort indicator] [filter icon]`. The label and sort indicator share a single click target that drives the sort tri-state. The filter icon is its own click target. Focusing a column for the profile panel is a separate affordance — a thin caret/handle on the far right of the header cell, or a right-click context action. (Final affordance choice happens in implementation; the spec only commits to "filter and profile-focus are not the same target as sort".)

- Click sort area (label + indicator) → sort tri-state (asc / desc / none).
- Click filter icon → `<FilterPopover>` opens with the format-appropriate widget.
- Click profile-focus affordance → that column becomes the focused column in the right panel.
- Active filters appear as chips in the toolbar; click chip × to remove.
- CSV export runs the current query without `LIMIT`, streams to a string in chunks, and downloads via `Blob` + `URL.createObjectURL`.

### Server vs client

- `page.tsx` and `loading.tsx` are server.
- Everything in `components/features/explore/` is `"use client"`.
- The dataset layout above stays server; only its `TABS` derivation changes.

## Loading, error, and edge cases

- **DuckDB cold start (~1–3s).** Route-segment `loading.tsx` renders the three-pane skeleton immediately. Once mounted, while `useDuckDB()` returns `ready: false`, `<LoadingState>` renders inside the skeleton with a "initializing query engine…" cue. Module-level cache means subsequent visits in the same tab are instant.
- **Parquet fetch failure.** Surfaced as a query rejection. `<ErrorState>` shows the failing file + retry button (re-runs `registerFileURL`). No silent fallback to sample data.
- **Empty result.** `<EmptyState>` inside the grid area: "No rows match these filters" + a "Clear filters" action. Profile panel keeps the schema view; stats render as `—`.
- **Filter producing invalid SQL.** Should be impossible — filter state is typed and the SQL builder is the only writer. Each query is wrapped in try/catch with a dev-only error code in the surface message.
- **Tab not applicable.** Direct hit on `/datasets/<not-parquet>/explore` returns `notFound()`.
- **CSV export size.** `holdings` is the largest (≈384KB parquet, likely 5–10k rows). Chunked serialization to a single Blob; no server roundtrip.
- **Memory.** Decompressed corpus is ~5–10MB resident. Acceptable.
- **Hydration.** Only the explorer subtree is `"use client"`. DuckDB worker starts lazily client-side, so no hydration mismatch risk.

## Testing

### Unit (Vitest)

- `tests/unit/acred-descriptor.test.ts` — boots Node DuckDB, runs `DESCRIBE` against each parquet, asserts every descriptor column exists in the parquet and types are compatible. Asserts no parquet column is silently undocumented. This is the regression guard for parquet/descriptor drift.
- `tests/unit/format-cell.test.tsx` — one test per format. Verifies render output (currency alignment, percent, null em-dash, enum tone class).
- `tests/unit/filters.test.ts` — SQL builder roundtrips (numeric range, multi-enum, date range, text substring). URL ser/de roundtrip on complex filter state.
- `tests/unit/format.test.ts` — number / date / percent formatters with default locale.

### E2E (Playwright)

One happy-path spec, `tests/e2e/explore-acred.spec.ts`:

1. Sign in as the default user, navigate to `/datasets/ds_acred`.
2. Confirm the `Explore` tab is present.
3. Click Explore, wait for grid to render.
4. Pick `holdings`, sort by a column, verify row order.
5. Apply an enum filter, verify the chip appears and the row count drops.
6. Focus a numeric column, verify the right-panel histogram renders.
7. Click "Export CSV", verify a download is triggered.

### Explicitly out of scope

- Load / perf testing (corpus too small for it to matter).
- DuckDB-specific perf budgets (route LCP is covered by `loading.tsx`).
- Bespoke accessibility audits beyond standard component conformance. Custom filter popovers go through the `accessibility-auditor` agent during implementation.

## Risks and open questions

- **DuckDB-WASM bundle size.** Adds ~1.5MB of WASM to the route bundle (lazy on the Explore tab segment only, so it doesn't impact other routes). Acceptable for a power-user surface. Verify in the build agent during impl.
- **Next.js 16 worker handling.** `new URL('...', import.meta.url)` is the supported pattern, but the exact `next.config.ts` knobs around WASM mime-types and worker emission may need a small adjustment — confirm during the first impl iteration.
- **Recharts and large data.** Profile chart data is pre-aggregated by DuckDB (≤ ~40 bars per chart), so Recharts stays comfortable.
- **Schema/Lineage/Runs for ACRED** show mock content in this iteration. A future iteration can replace those with parquet-derived metadata.

## Implementation order (input for writing-plans)

1. `lib/data/` foundation: `duckdb.ts`, `use-duckdb.ts`, types, registry. Smoke-test in a throwaway route.
2. ACRED descriptors (`lib/data/acred/tables.ts`) plus the drift test.
3. `useTableSchema`, `useTableQuery`, `format.ts`, `format-cell.tsx`. Unit tests.
4. Fixture additions (`ds_acred`, `org_apollo`) and dataset-derived tabs in the layout.
5. New route `app/(app)/datasets/[datasetId]/explore/` with skeleton and `<DatasetExplorer>` shell.
6. `<TablePicker>` and basic `<DataGrid>` with sort and pagination, no filters yet.
7. `filters.ts` (state + SQL + URL) and per-format filter widgets, then `<FilterPopover>` and toolbar chips.
8. `useColumnProfile` plus the three profile chart components and `<ColumnProfilePanel>`.
9. CSV export.
10. Loading / empty / error states polished.
11. E2E spec.
