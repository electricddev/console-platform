# ACRED Methodology Compose — Design

**Date:** 2026-05-11
**Status:** Approved (brainstorming)
**Owner:** @electricddev
**Builds on:** `docs/superpowers/specs/2026-05-11-acred-explore-tab-design.md`

## Goal

Let a counterparty author a notebook of multiple ACRED-backed queries from a curated methodology library, for demo'ing an allocator's underwriting workflow. Queries execute in-browser against the existing DuckDB-WASM engine; results render as shape-appropriate visuals (metric card / comparison bars / time-series / breakdown bar / table). The composed notebook saves to the existing notebooks store and renders live results in the read-only viewer.

## Non-goals

- A SQL editor with autocomplete, syntax highlighting beyond Monaco's defaults, or formatter.
- Visual query builder (point-and-click table/aggregation/group-by).
- Persisting query results alongside cells — queries re-execute on every viewer mount.
- Comparison across funds (only ACRED exists today).
- A `comparison` cell kind, drag-and-drop reorder, per-cell parameterization. Deferred (Approach C).
- Changes to `/notebooks/new`; the existing title-only stub stays.
- Live-binding legacy fixture notebooks (mF-ONE, etc.) to DuckDB. Those continue rendering static fixture data.
- Multi-dataset notebooks. Every cell implicitly targets ACRED. A `datasetId` field on cells is a future addition.

## Audience and surface

`/notebooks/[notebookId]` continues as the read-only viewer.
`/notebooks/[notebookId]/compose` is the new editor route. Author-only (gated server-side); other users redirected or 404'd.
An "Edit" button on the viewer (visible to the author) links to compose.

## Architecture

### Engine reuse

The `lib/data/` singleton from the Explore tab is the execution engine. Both compose and viewer mount as client subtrees and share the same DuckDB instance per tab session. No new init logic.

### Cell schema

`NotebookCellSchema`'s `query` variant gains two optional fields:

```ts
z.object({
  id: z.string(),
  kind: z.literal('query'),
  templateId: z.string().optional(),
  dsl: z.string(),
  parameters: z.record(z.unknown()).default({}),
  runId: z.string().optional(),
  methodologyId: z.string().optional(),
  renderShape: z.enum(['metric','comparison','time-series','breakdown','table']).optional(),
})
```

Both additive and optional — every existing fixture parses unchanged.

`methodologyId` is the join key into the static methodology catalog (title, description, axis). `renderShape` is stored on the cell so the visual is deterministic across runs even if the catalog changes later.

### Save flow

`useReducer` in the compose client holds cells. The existing `updateNotebookCells` mock endpoint persists the array on Save (no new endpoint). No auto-save — Save is explicit so the demo flow stays deterministic.

### Viewer behavior

A new client component `<ExecutableQueryCell />` runs the cell's DSL in DuckDB on mount and renders via `<ResultRenderer />`. The viewer's existing dispatcher routes each query cell:
- `methodologyId` present → `<ExecutableQueryCell />` (live).
- `methodologyId` absent (legacy fixture cells with `runId`) → existing `<CellQuery />` (static display).

This dual path keeps the existing mF-ONE memo fixture working byte-identically.

### Execution context

All cells implicitly target the ACRED DuckDB views (`borrowers`, `holdings`, `concentration_metrics`, `credit_events`, `fund_overview`). No per-cell dataset binding. Multi-dataset notebooks are a future addition that adds `datasetId` to the cell.

## Routes

- **New** `app/(app)/notebooks/[notebookId]/compose/page.tsx` (server)
  - `requireUser()`, fetch notebook, gate `notebook.authorId === session.id` else `notFound()`.
  - Renders `<NotebookComposer notebook={n} />`.
- **New** `app/(app)/notebooks/[notebookId]/compose/loading.tsx` — three-pane skeleton.
- **Modified** `app/(app)/notebooks/[notebookId]/page.tsx`
  - Add an Edit button (visible to author only) linking to compose.
  - Replace the inline query-cell dispatch: if `cell.methodologyId`, render `<ExecutableQueryCell />`; else keep `<CellQuery />`.

## Methodology library

One static file: `lib/data/acred/methodology.ts`. Closed-typed entries:

```ts
type RenderShape = 'metric' | 'comparison' | 'time-series' | 'breakdown' | 'table'
type Axis = 'time' | 'segment' | 'snapshot'

type Methodology = {
  id: string
  title: string
  description: string
  axis: Axis
  shape: RenderShape
  dsl: string
}
```

### Output contract per shape

| Shape | Expected result | Renderer |
|---|---|---|
| `metric` | 1 row, ≥1 col. First col is the value; optional second col labeled `prior` for delta. | Single big number + tone-colored delta if `prior` present. |
| `comparison` | 2 rows × 2 cols: `(label, value)`. Order matters — row 1 is the primary, row 2 the comparand. | Two labeled bars side-by-side; the difference is rendered as a delta badge above. |
| `time-series` | N rows, 2 cols: `(period_iso, value)`. | Recharts line chart. |
| `breakdown` | N rows, 2 cols: `(label, value)`. Top-N rendering caps at 10. | Horizontal bar. |
| `table` | Free-form N×M. | Compact grid (reuse `<Cell />` from `lib/data/format-cell.tsx`). |

### Initial catalog (12 entries)

| id | title | axis | shape |
|---|---|---|---|
| `acred.nav_trend` | NAV over time | time | time-series |
| `acred.weighted_coupon_now_vs_prior` | Weighted-avg coupon: current vs 12mo ago | time | comparison |
| `acred.top10_borrowers` | Top-10 borrower exposure | snapshot | breakdown |
| `acred.sector_mix` | Exposure by industry sector | segment | breakdown |
| `acred.geo_mix` | Exposure by geography | segment | breakdown |
| `acred.rating_mix` | Internal rating distribution | snapshot | breakdown |
| `acred.maturity_profile` | Maturity buckets (0-1y, 1-3y, 3-5y, 5y+) | snapshot | breakdown |
| `acred.watchlist_pct_over_time` | Watchlist % of book over time | time | time-series |
| `acred.event_frequency_by_month` | Credit event count by month | time | time-series |
| `acred.event_severity_mix` | Credit event severity mix | snapshot | breakdown |
| `acred.first_lien_pct` | First-lien % of book (current) | snapshot | metric |
| `acred.hhi_concentration` | Concentration HHI (current) | snapshot | metric |

The implementer hand-writes each `dsl` against the discovered ACRED schemas. Each query is verified by adding it to a fresh notebook in the E2E spec and asserting execution succeeds.

## Components and file layout

```
lib/data/
  methodology.ts                    types (Methodology, RenderShape, Axis)
  acred/methodology.ts              catalog (12 entries)
  use-cell-query.ts                 hook: runs a single DSL once per cell mount + caches result

components/features/compose/
  notebook-composer.tsx             client root, useReducer<ComposerState>, save flow
  methodology-sidebar.tsx           catalog list grouped by axis, click-to-add
  compose-cell-list.tsx             ordered cell list with up/down/delete controls
  compose-cell-shell.tsx            wrapper: title, controls, dirty marker, body slot
  cell-markdown-editor.tsx          textarea
  cell-query-editor.tsx             Monaco editor + Run button + result preview
  result-renderer.tsx               dispatches on renderShape
  result-metric.tsx                 big number + optional delta
  result-comparison.tsx             two-bar
  result-time-series.tsx            Recharts line
  result-breakdown.tsx              horizontal Recharts bar
  result-table.tsx                  compact grid using <Cell />
  save-bar.tsx                      sticky: dirty indicator + Save + "View" link

components/features/notebooks/
  executable-query-cell.tsx         NEW — wraps useCellQuery + ResultRenderer for viewer

app/(app)/notebooks/[notebookId]/
  page.tsx                          modify: Edit button + executable cell dispatch
  compose/page.tsx                  NEW server route
  compose/loading.tsx               NEW skeleton

lib/api/schemas.ts                  modify: NotebookCellSchema query variant +2 optional fields
```

### Composer state shape

```ts
type ComposerState = {
  cells: NotebookCell[]
  dirty: boolean
  running: Set<string>            // cell ids currently executing
  results: Record<string, CellResult | undefined>   // ephemeral; not saved
}

type ComposerAction =
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
  | { type: 'reset-from'; cells: NotebookCell[] }  // after save
```

### Layout

Three-pane on desktop, stack on small screens:
- Left rail (240px): `<MethodologySidebar />` — entries grouped by axis (Time / Segment / Snapshot) with click-to-add. Plus "Add markdown" and "Add custom query" buttons.
- Center (fluid): `<ComposeCellList />` — vertically stacked cells; each cell renders `<ComposeCellShell>` with body = markdown editor or query editor.
- Right (sticky top): `<SaveBar />` — dirty indicator, Save button (disabled when not dirty), "View" link to viewer.

## Schema & API

### Zod additions (additive)

In `lib/api/schemas.ts`, the `NotebookCellSchema` query variant gets two optional fields:

```ts
z.object({
  id: z.string(),
  kind: z.literal('query'),
  templateId: z.string().optional(),
  dsl: z.string(),
  parameters: z.record(z.unknown()).default({}),
  runId: z.string().optional(),
  methodologyId: z.string().optional(),
  renderShape: z.enum(['metric','comparison','time-series','breakdown','table']).optional(),
})
```

The `Notebook` Zod schema and inferred type pick these up automatically.

### No new endpoints

`updateNotebookCells` already accepts `cells: NotebookCell[]`. Save calls it once per click.

## Loading, error, and edge cases

- **DuckDB cold start.** First cell run incurs ~1–3s init. Cell shows "Initializing query engine…" then "Running…" then result. Subsequent cell runs in the same tab are instant.
- **Cell query error.** Result panel of that cell shows the error message (DuckDB error class + message). Other cells unaffected.
- **Empty methodology save.** Save with zero cells is allowed; the notebook collapses to an empty cell list. Viewer renders nothing.
- **Concurrent edit conflict.** Out of scope for the demo. Last-write-wins via `updateNotebookCells`.
- **Auth.** Compose route is author-only. Non-author viewers see the Edit button hidden and get 404 if they navigate directly to `/compose`.
- **Stale methodology id.** If a saved cell references a `methodologyId` that no longer exists in the catalog (entry removed), the cell still executes its stored `dsl` and renders by stored `renderShape`. The title falls back to "Custom query." This decouples saved notebooks from catalog churn.

## Testing

### Unit (Vitest)

- `tests/unit/data/methodology.test.ts`
  - Every entry has required fields, axis/shape from closed unions, unique `id`.
  - Every `dsl` references only the 5 known ACRED views (regex match, no execution).
  - Catalog count ≥ 10 (sanity: we don't ship a half-empty library).
- `tests/unit/compose/result-renderer.test.tsx`
  - One test per shape: given a mock result, the correct visual component renders.
  - Metric with `prior` value shows delta with correct tone.
- `tests/unit/compose/composer-reducer.test.ts`
  - `add-methodology` appends a cell with the methodology's id and shape.
  - `move-cell` up/down respects bounds.
  - `start-run` / `finish-run` / `fail-run` update `results` and `running` correctly.
  - `reset-from` clears dirty.

### E2E (Playwright)

One spec, `tests/e2e/compose-acred.spec.ts`:
1. Sign in as the demo counterparty.
2. Navigate `/notebooks/new`, enter a title, submit → land in viewer.
3. Click Edit → land on `/compose`.
4. From the methodology sidebar, add 4 cells covering each non-trivial shape: one `metric`, one `comparison`, one `time-series`, one `breakdown`.
5. Per cell: wait for result to render. Assert the correct visual is present (e.g. for time-series, a `<svg>` with at least one `<path>` from Recharts; for breakdown, ≥1 horizontal bar).
6. Click Save. Save button transitions to disabled.
7. Click View → back on viewer.
8. Assert each of the 4 saved cells renders via `<ExecutableQueryCell />` with its result visual.
9. Console warnings inspected: zero `[descriptor-drift]` warnings throughout.

This spec doubles as the methodology DSL validator: any catalog entry that fails to execute in the compose step fails the test.

### Out of scope

- Visual regression / screenshot tests. UI quality is verified via the `visual-fix` loop during implementation.
- Cross-browser. Playwright runs chromium only (existing project setup).
- Performance budgets specific to compose; DuckDB cold start is already covered by the Explore tab's loading state design.

## Risks and open questions

- **DuckDB-WASM `prepare()` instability.** The Explore tab worked around this in `useColumnProfile` by switching to direct queries with inline literals (`buildWhereInline` + `literalSQL`). The new `use-cell-query` hook should adopt the same pattern from the start. DSL strings come from the methodology catalog (trusted) plus Monaco-edited custom queries (treated as user input — but they only ever run in the user's own browser tab, so SQL "injection" only affects the user's own DuckDB instance). Acceptable threat model for this demo.
- **Cell ordering UX.** Up/down buttons are deliberately spartan. Drag-and-drop (DnD library) is Approach C and out of scope.
- **Save conflicts.** No backend, no locking. A future server-backed iteration adds optimistic concurrency control.
- **Methodology DSL drift.** If the ACRED descriptors gain or rename columns, the methodology DSLs may break silently. The E2E spec catches this: every catalog entry executes during the spec, so any broken DSL fails CI.

## Implementation order (input for writing-plans)

1. Types: `lib/data/methodology.ts`.
2. Methodology catalog: `lib/data/acred/methodology.ts` (12 entries, hand-written DSL).
3. Methodology structure test (`tests/unit/data/methodology.test.ts`).
4. Schema additions: `NotebookCellSchema` gets `methodologyId?` and `renderShape?`.
5. `use-cell-query` hook (browser-side DuckDB execution per cell).
6. Result renderer dispatcher + 5 shape components.
7. Result renderer unit tests.
8. ComposerReducer + unit tests.
9. `<NotebookComposer />` client root with sidebar + cell list + save bar.
10. Markdown and query cell editors (Monaco wiring).
11. New route `app/(app)/notebooks/[notebookId]/compose/` with skeleton + composer mount.
12. Viewer modifications: Edit button + `<ExecutableQueryCell />` dispatch.
13. E2E spec.
14. Final typecheck / lint / build / E2E pass.
