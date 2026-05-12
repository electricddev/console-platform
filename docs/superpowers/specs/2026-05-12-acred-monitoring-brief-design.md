# ACRED Monitoring Brief — Design

**Date:** 2026-05-12
**Status:** Approved (brainstorming)
**Owner:** @electricddev
**Builds on:** `2026-05-11-acred-explore-tab-design.md`, `2026-05-11-notebook-compose-methodology-design.md`

## Goal

Make the existing dataset, notebook, and query surfaces feel like an analyst's morning workflow — not a pile of tabs — for an allocator persona (InfiniFi / Gauntlet). Re-shape three surfaces around the standard credit-analyst loop **monitor → spot what changed → drill → memo**, anchored on real ACRED data and padded with mocked-but-correct UI for the bullish moments we can't yet implement against live attestations.

The artefact this slice produces: an ACRED page an analyst opens in the morning, sees what moved quarter-over-quarter, drills into the offending rows in two clicks, and lands in the existing memo composer with the snapshot pre-loaded.

## Non-goals

- No new attestation pipeline. The "issuer attestation discipline" tile reads from a fixture; the underlying SLA system is out of scope.
- No real AMM, oracle, or live NAV stream. The `/datasets/acred/amm` tab is a mocked Persona 2 demo with a setInterval-driven feed.
- No real peer-fund data. Cross-fund consensus pricing and the peer rows in the portfolio list are mocked fixtures with the same `Dataset` schema.
- No credit ratings. We do not issue credit opinions; the "Grade" column from earlier mockups is removed entirely (see §Attestation, not credit rating).
- No memo template re-frame. Slice 1 hands off to the existing `/notebooks/[id]/compose` surface unchanged; a structured 5-Cs memo workspace is slice 2.
- No multi-asset cross-cutting analytics. Peer dispersion is shown as a *panel* on the ACRED brief, not a separate cross-asset surface.
- No new auth model, no per-asset permissions. Same three-persona stub auth as today.
- No real-time push. Anomaly feed is request/response on page load and an on-demand refresh button; no WebSocket.

## Audience and surface

Two personas, three surfaces:

| Surface | Route | Persona | Purpose |
|---|---|---|---|
| Credit Portfolio | `/datasets` (reframed) | DD analyst | Morning scan — which asset moved, which is flagged, where do I look |
| ACRED Monitoring Brief | `/datasets/acred` (transformed overview) | DD analyst | Single-asset what-changed view + drill-out CTAs |
| AMM Operations | `/datasets/acred/amm` (new tab) | AMM operator | Mocked live consumption view of the same data |

Existing tabs (`explore`, `schema`, `lineage`, `runs`, `templates`) remain unchanged and become drill destinations. `/notebooks/[id]/compose` remains unchanged and is the "Draft memo" off-ramp.

## The attestation column, not a credit rating

Earlier mockups carried a "Grade B+ ✓" column. Research (Aladdin, Bloomberg CRPR, Moody's CreditView, S&P Capital IQ) confirmed those platforms show *NRSRO credit ratings* — they license multi-agency data or *are* a rating agency. Hyve is neither; an unsourced letter grade reads as a credit opinion we are not authorized to make. The grade is removed.

In its place, every asset row and the ACRED brief carry a concrete, source-attributable **attestation column**:

| Column / tile | Shows | Source |
|---|---|---|
| Portfolio table `Attestation` | `<on-time %> · last <timestamp ago>` (e.g. `98% · 3h ago`) | Real for ACRED from `lastAttestedAt`; mocked for peers. |
| Brief header tile | `Last attest 3h · 28/30 expected on time · 2 gaps last 30d` | Fixture for now; same shape future SLA system will produce. |
| Tile in side panel | "Issuer attestation discipline" — same numbers, with delivered/expected breakdown | Same fixture; clearly *not* a credit grade. |

This sharpens positioning: *we don't grade credit — your rating agency does. We grade whether the data the rating relies on is fresh, attested, and complete.*

## Architecture

### Data layer (real ACRED)

ACRED brief facts come from three sources:

1. **DuckDB-WASM** (existing client engine) for any computation the analyst can drill into. The brief reuses `lib/data/use-cell-query.ts` and `lib/data/use-table-query.ts` to run the same query the methodology library already exposes.
2. **`lib/data/acred/facts.ts`** (new) — a static snapshot of the latest period's vital signs and the period-over-period (QoQ) deltas. Hand-written from the parquet truth, pre-computed at build time. Keeps the server-rendered brief fast and avoids spinning up WASM on the server. Refreshed when ACRED parquet files change.
3. **`lib/data/acred/red-flags.ts`** (new) — a pure rule library evaluated against the facts. Returns a list of tripped flags with severity, reason, and drill hrefs.

### Data layer (mocked peers + side panels)

Same `Dataset` Zod schema as today, four new fixtures appended to `lib/api/fixtures/datasets.ts`: `ds_mfone`, `ds_jaaa`, `ds_fasanara`, `ds_ams_credit`. Each carries plausible NAV / leverage / non-accrual / attestation values and a `BriefSnapshot` mocked block (new field on the Dataset schema, see §Schema). They render in the portfolio table alongside ACRED; clicking a peer row routes to `/datasets/<id>` and lands on the current legacy overview unchanged (only ACRED's overview is transformed in slice 1).

Three new fixture endpoints back the mocked side panels of the brief:

- `getAcredPeerDispersion(ctx)` — cross-fund consensus pricing fixture, ~3-5 borrowers with mark dispersion across mocked peer funds.
- `getAcredAttestationDiscipline(ctx)` — discipline tile fixture (on-time %, gaps, trend).
- `getAcredAmmFeed(ctx)` — AMM operations fixture (NAV, CI, fees, capacity, swap stats, anomaly stream).

Each is a `mockEndpoint` with a small `latencyMs` and a Zod schema. Existing endpoints `listDatasets`, `getDataset`, `getDatasetLineage` are unchanged.

### Component composition

```
app/(app)/datasets/page.tsx                          (modify)
  └ <PortfolioTable />                                NEW — replaces DatasetTable layout
      ↳ <AttestationCell />                           NEW — on-time % + last attestation
      ↳ <DeltaCell />                                 NEW — value + delta + tone

app/(app)/datasets/[datasetId]/page.tsx              (transform for datasetId=ds_acred)
  ├ <BriefHeader />                                   NEW — name, issuer, attest header tile
  ├ <VitalSignsPanel />                               NEW — 6× <DeltaTile />, QoQ deltas
  ├ <RedFlagScoreboard />                             NEW — renders RedFlag[] from endpoint
  ├ <AnomalyFeed />                                   NEW — from credit_events table
  ├ <PeerDispersionPanel />                           NEW — mocked, clearly labelled
  ├ <AttestationDisciplineTile />                     NEW — mocked, clearly labelled
  └ <DrillOutActions />                               NEW — CTA strip
  (For non-ACRED ids: render existing overview unchanged — slice 1 only transforms ACRED.)

app/(app)/datasets/[datasetId]/amm/page.tsx          (new route)
  └ <AmmOpsPanel />                                   NEW — client, setInterval-driven mock
      ↳ <LiveNavTile />                               NEW — NAV + 95% CI
      ↳ <InventoryTile />                             NEW
      ↳ <FreshnessSLATile />                          NEW
      ↳ <SwapCapacityTile />                          NEW
      ↳ <CounterfactualCalculator />                  NEW — slider + recomputed CI
      ↳ <AmmAnomalyStream />                          NEW — re-uses AnomalyFeed item, gated by AMM event type
```

### Reuse

- `<AttestationBadge>`, `<FreshnessIndicator>`, `<CopyableHash>` — every tile that surfaces a number consumes one of these. Already exist.
- `<MetricCard>` — kept for any non-delta tile; `<DeltaTile>` is a derivative.
- Existing `useCellQuery` hook — used for the anomaly feed's join of `credit_events` against the holdings list.
- Existing methodology library — every vital-sign DSL already exists; the brief just runs them and renders deltas. No new DSLs.

## Routes

### Modified

`app/(app)/datasets/[datasetId]/page.tsx`
- Branch on `datasetId === 'ds_acred'` for slice 1. ACRED gets the new brief layout; other dataset ids keep the current overview verbatim.
- This deliberate branch is a slice-1 affordance; slice 2 will replace the branch with a polymorphic dataset-kind dispatch.

`app/(app)/datasets/page.tsx`
- Swap `<DatasetTable />` for `<PortfolioTable />`.
- Add the four mocked peer dataset fixtures (`ds_mfone`, `ds_jaaa`, `ds_fasanara`, `ds_ams_credit`).
- Default sort: critical-flag-count desc, then attestation-on-time-% asc.

`app/(app)/datasets/[datasetId]/layout.tsx`
- Add an "AMM" tab (visible only when `datasetId === 'ds_acred'`).

### New

`app/(app)/datasets/[datasetId]/amm/page.tsx`
- Server: gate non-ACRED ids to `notFound()`.
- Renders `<AmmOpsPanel />`.

`app/(app)/datasets/[datasetId]/amm/loading.tsx`
- Skeleton matching the four-tile + stream layout.

## Schema & API

### New Zod types (additive)

In `lib/api/schemas.ts`:

```ts
export const DeltaToneSchema = z.enum(['positive', 'negative', 'neutral'])

export const DeltaSchema = z.object({
  // The raw current value, formatted by the consumer.
  value: z.number(),
  // The QoQ delta (current - prior) in the value's native unit.
  delta: z.number(),
  // pp = percentage points; pct = percent of value; abs = raw units.
  deltaKind: z.enum(['pp', 'pct', 'abs']),
  tone: DeltaToneSchema,
})

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

export const RedFlagSchema = z.object({
  id: z.string(),
  label: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
  reason: z.string(),
  drillHref: z.string().nullable(),
})

export const AnomalyEventSchema = z.object({
  id: z.string(),
  occurredAt: z.string().datetime(),
  kind: z.enum(['credit-event', 'filing', 'attestation-gap', 'amm-sla']),
  severity: z.enum(['info', 'low', 'medium', 'high']),
  title: z.string(),
  borrowerNormalized: z.string().nullable(),
  detailHref: z.string().nullable(),
})

export const PeerMarkSchema = z.object({
  fund: z.string(),
  mark: z.number(),
  lastUpdated: z.string().datetime(),
  hyveVerified: z.boolean(),
})

export const PeerDispersionRowSchema = z.object({
  borrowerNormalized: z.string(),
  marks: z.array(PeerMarkSchema),
  dispersionPoints: z.number(),
  commentary: z.string().nullable(),
})

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
```

### `Dataset` extension (additive)

`DatasetSchema` gets one new optional field:

```ts
briefSnapshot: BriefSnapshotSchema.optional()
```

Set for ACRED and the four peer fixtures. Unset for legacy datasets — existing surfaces unaffected.

### New endpoints

In `lib/api/endpoints/datasets.ts`:

```ts
export const getAcredBriefRedFlags = mockEndpoint(/* … */)            // real, computed from facts.ts
export const getAcredAnomalyFeed = mockEndpoint(/* … */)              // real, joins credit_events ∩ held borrowers
export const getAcredPeerDispersion = mockEndpoint(/* … */)           // mocked fixture
export const getAcredAttestationDiscipline = mockEndpoint(/* … */)    // mocked fixture
export const getAcredAmmFeed = mockEndpoint(/* … */)                  // mocked fixture
```

Each is a server-callable Zod-validated mock endpoint. Server components await them in parallel via `Promise.all` (matching the existing dataset overview pattern).

`listDatasets` is unchanged — it already returns the `Dataset[]` shape that the new `briefSnapshot` rides on.

## Red flag rule library

`lib/data/acred/red-flags.ts`:

```ts
export type RedFlagRule = {
  id: string
  label: string
  severity: RedFlag['severity']
  evaluate: (snapshot: BriefSnapshot, facts: AcredFacts) => RedFlagResult
}

type RedFlagResult = { tripped: false } | {
  tripped: true
  reason: string
  drillHref: string | null
}

export const acredRedFlagRules: RedFlagRule[] = [
  // 1. Non-accrual % rising QoQ
  // 2. Non-accrual % above absolute threshold (1.5%)
  // 3. Leverage QoQ delta > 200bps
  // 4. Leverage absolute > 75%
  // 5. Top-10 concentration drift > 200bps QoQ
  // 6. Single industry > 25% of book
  // 7. PIK % above absolute threshold (8%) OR rose > 100bps QoQ
  // 8. New HIGH-severity credit event linked to held borrower in last 30d
]
```

Rules are pure functions taking `(snapshot, facts)`. `evaluate()` never queries — it consults the in-memory snapshot and facts. The brief page composes results into `<RedFlagScoreboard />`. Each tripped rule's `drillHref` deep-links into either:
- `/datasets/acred/explore?table=holdings&filter=...` (filtered grid)
- `/datasets/acred/explore?table=concentration_metrics&...`
- `/datasets/acred?anchor=anomaly-feed#evt_<id>` (anchor into the same page's feed)

Drill hrefs are constructed by the rule itself, not the renderer — so a future rule that wants to deep-link into the methodology library can do so without changing the scoreboard.

## Anomaly feed (real)

`getAcredAnomalyFeed(ctx)` reads from the existing `credit_events` and `holdings` ACRED tables (via DuckDB on the server is not viable; the endpoint instead reads a pre-computed JSON snapshot generated alongside `facts.ts` at build time). Filtering rule: `is_credit_relevant = true AND linked_borrower_normalized IN (latest holdings.borrower_normalized)`. Output sorted by `event_date DESC`, capped at 20. Each row carries:
- `kind: 'credit-event'`
- `severity: 'high' | 'medium' | 'low'`
- `borrowerNormalized` (for the tag)
- `detailHref → /datasets/acred/explore?table=credit_events&accession=<n>`

Filing rows are derived from `fund_overview` rows added since the prior brief snapshot (kind `'filing'`).
Attestation-gap rows come from the (mocked) `AttestationDiscipline` — see §AMM. The mocked side is clearly badged in the feed (`<Badge tone="muted">demo</Badge>`).

## AMM Operations (mocked)

`<AmmOpsPanel />` is a client component. On mount:
1. Calls `getAcredAmmFeed()` once (server-rendered initial state).
2. Starts a 5s `setInterval` that mutates the local state with deterministic jitter (small NAV walks, freshness counter, occasional anomaly insertion). No SWR — the panel is a self-contained demo.

The "Counterfactual capacity calculator" is a slider over `navCI95` that recomputes `maxSwapSize` via a closed-form: `cap = inventoryAsset × (1 − k × navCI95)` for a fixed `k`. The "without Hyve" toggle multiplies `navCI95 × 10` and shows the resulting cap. Numbers are illustrative and labelled as such in a footnote.

The anomaly stream re-uses `<AnomalyFeed />` but filtered to `kind ∈ {'amm-sla', 'credit-event'}`. The real `credit-event` rows come through; mocked `amm-sla` rows are emitted by the interval.

## Layout

### `/datasets` reframed

```
┌─────────────────────────────────────────────────────────────────────────┐
│ // catalog                                                              │
│ Credit Portfolio                                                        │
│ 5 assets · 3 active flags · 1 critical                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ [Filters]            │ Asset  Class  NAV  Δ7d  Lev  Non-acc  Attestation│
│  Asset class         │ ACRED  PC     …    …    …    …        98% · 3h  │
│  Status              │ mF-ONE PC     …    …    …    …        91% · 2h  │
│  Watchlist           │ JAAA   PC     …    …    …    …        99% · 4h  │
│                      │ …                                                │
└─────────────────────────────────────────────────────────────────────────┘
```

- Existing filter rail kept.
- Existing `<DatasetTable />` columns replaced by the portfolio shape; the underlying row click still routes to `/datasets/[id]`.
- The "ask the dataset" surface and AI anomaly InsightCard panel (currently at `/datasets/[id]`) are intentionally not promoted to the list — they live one level deeper on the brief.

### `/datasets/acred` (Monitoring Brief)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ACRED · Apollo Diversified Credit Fund                                  │
│ Period end 2026-03-31 · Last attest 3h · 28/30 expected · 2 gaps        │
├─────────────────────────────────────────────────────────────────────────┤
│ Vital signs · 2026-Q1 vs 2025-Q4                                        │
│ ┌─NAV──────┬─Leverage─┬─Non-accrual─┬─Top-10 conc─┬─PIK %─┬─Net flow─┐   │
│ │ $1.612B  │ 73.0%    │ 1.42%       │ 32.4%       │ 8.3%  │ -$23M    │   │
│ │ -1.1% ↓  │ +0.4pp↑  │ +0.21pp ↑⚠  │ +1.8pp ↑    │ +1.1pp│ redemps  │   │
│ └──────────┴──────────┴─────────────┴─────────────┴───────┴──────────┘   │
├──────────────────────────────────────┬──────────────────────────────────┤
│ Red flag scoreboard · 3 of 8 tripped │ Peer dispersion (demo)           │
│ ⚠ Non-accrual rose 21bps → 12 holdings│ Borrower X marks · ACRED 98.2 …  │
│ ⚠ PIK % rose 110bps → PIK positions  │                                  │
│ ⚠ Software industry > 25% → mix      │ Attestation discipline (demo)    │
│                                       │ Daily NAV  ✓ 30/30               │
│ Anomaly feed · last 30d              │ Weekly lev ⚠ 4/5                 │
│ 2d  HIGH    Borrower Y (held) 8-K     │ Monthly    ✓ 30/30               │
│ 5d  MEDIUM  Borrower Z (held) 8-K     │ Quarterly  ✓ 4/4                 │
│ 9d  filing  Q1 2026 loaded            │                                  │
├──────────────────────────────────────┴──────────────────────────────────┤
│ [Open Explore · 12 non-accrual holdings] [Draft DD memo] [Raw filings]  │
└─────────────────────────────────────────────────────────────────────────┘
```

- Two-column main body on desktop, stacked on small screens.
- "Draft DD memo" links to `/notebooks/new?prefill=acred-brief-2026-q1`. Slice 1 hands an empty notebook with a title; slice 2 pre-fills cells.
- "Open Explore" links carry deep filter params consumed by the existing Explore tab (already supports URL-encoded filters per the explore-tab spec).

### `/datasets/acred/amm`

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ACRED · AMM Operations (demo)                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌─Live NAV─────┬─Inventory─────┬─Active fee─────┬─Max swap────────┐    │
│ │ $100.42      │ $4.2M ACRED   │ 12 bps         │ $850k           │    │
│ │ ± $0.018     │ $2.8M USDC    │ ↑ from 8 bps   │ gated: confid.  │    │
│ │ fresh 3s     │               │ vol ↑          │                  │    │
│ └──────────────┴───────────────┴────────────────┴─────────────────┘    │
│ 24h: 47 swaps · $1.8M · 0 reverts · Sharpe 2.4                          │
├─────────────────────────────────────────────────────────────────────────┤
│ Counterfactual capacity calculator                                      │
│ NAV CI: [▒▒▒▒▒░░░░░] 0.18%   ▢ Without Hyve verification               │
│ → max swap $50M    → without Hyve: $5M                                  │
│ Implied annual swap revenue: $X with · $X/10 without                    │
├─────────────────────────────────────────────────────────────────────────┤
│ Anomaly stream                                                          │
│ 2m   AMM-SLA  NAV freshness 62s > 60s SLA → cap reduced to $400k        │
│ 5d   CREDIT   Borrower Y 8-K medium severity                            │
│ …                                                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

## File layout

```
lib/data/acred/
  facts.ts                   NEW — static snapshot (vitals, prior period, computed at build)
  red-flags.ts               NEW — rule library
  anomalies.ts               NEW — pre-computed credit_events ∩ holdings join
  peers.ts                   NEW — mocked peer fixtures (cross-fund consensus)
  attestation-discipline.ts  NEW — mocked tile fixture
  amm.ts                     NEW — mocked AMM feed fixture
  facts.test.ts              NEW — guard that facts.ts shape matches BriefSnapshotSchema

lib/api/schemas.ts           MODIFY — add Delta, BriefSnapshot, RedFlag, AnomalyEvent,
                                       PeerMark, PeerDispersionRow, AttestationDiscipline,
                                       AmmFeed; extend DatasetSchema with briefSnapshot?
lib/api/fixtures/datasets.ts MODIFY — add 4 peer datasets, attach briefSnapshot to ACRED
lib/api/endpoints/datasets.ts MODIFY — add 5 new mock endpoints

components/features/portfolio/
  portfolio-table.tsx        NEW — replaces DatasetTable in /datasets list
  attestation-cell.tsx       NEW — on-time % + last attestation
  delta-cell.tsx             NEW — value + delta + tone for table cells

components/features/brief/
  brief-header.tsx           NEW
  vital-signs-panel.tsx      NEW
  delta-tile.tsx             NEW — single big number + delta + tone
  red-flag-scoreboard.tsx    NEW
  anomaly-feed.tsx           NEW
  peer-dispersion-panel.tsx  NEW (demo-badged)
  attestation-discipline-tile.tsx NEW (demo-badged)
  drill-out-actions.tsx      NEW

components/features/amm/
  amm-ops-panel.tsx          NEW — client root, 5s interval
  live-nav-tile.tsx          NEW
  inventory-tile.tsx         NEW
  freshness-sla-tile.tsx     NEW
  swap-capacity-tile.tsx     NEW
  counterfactual-calculator.tsx NEW
  amm-anomaly-stream.tsx     NEW (re-uses AnomalyFeed item)

app/(app)/datasets/page.tsx                          MODIFY — swap to PortfolioTable
app/(app)/datasets/[datasetId]/page.tsx              MODIFY — branch for ds_acred
app/(app)/datasets/[datasetId]/layout.tsx            MODIFY — AMM tab when ds_acred
app/(app)/datasets/[datasetId]/amm/page.tsx          NEW
app/(app)/datasets/[datasetId]/amm/loading.tsx       NEW
```

## Loading, error, and edge cases

- **ACRED snapshot stale.** `facts.ts` carries `periodEnd`. If the latest filing in DuckDB is newer than `periodEnd`, the brief header shows a "Snapshot out of date" warning with a "Refresh" link (slice 1: link to a doc explaining the rebuild process; slice 2: programmatic refresh).
- **Empty anomaly feed.** If no credit events match held borrowers in the last 30 days, render an empty-state card with copy ("No credit events linked to held borrowers in this window"). Never an empty list.
- **Red-flag rule throws.** Rules are pure functions, but defensive: wrapping `evaluate()` in try/catch returns `{ tripped: false }` with a `console.error`. One broken rule must not break the scoreboard.
- **AMM interval cleanup.** `useEffect` returns a cleanup that clears `setInterval`. Reusing the pattern from `<ExecutableQueryCell />` (per `useCellQuery` documented behavior).
- **Non-ACRED dataset clicks.** Routing to `/datasets/ds_mfone` etc. lands on the existing legacy overview unchanged — no error, no broken brief layout. The peer rows are explicitly out of scope for the brief surface.
- **AMM tab on non-ACRED.** Server-side `notFound()`. The layout suppresses the tab anyway, but defense in depth.
- **Persona without permission to view AMM.** Out of scope — slice 1 leaves the AMM tab visible to all logged-in users. Slice 3 introduces per-persona gating.
- **Anomaly drill-out into Explore.** The Explore tab already URL-encodes filters per the explore spec. Verify the chosen filter param names (`table`, `filter`, `where`, etc.) match the existing implementation; do not invent new ones.

## Testing

### Unit (Vitest)

- `tests/unit/data/acred/facts.test.ts` — `facts.ts` parses against `BriefSnapshotSchema`. Each delta's tone is consistent with its sign (negative delta on `nonAccrualPct` ≠ negative tone — context matters; each vital declares its "good direction").
- `tests/unit/data/acred/red-flags.test.ts` — eight rules, each gets a "tripped" and "not tripped" fixture. Tests assert `tripped`, `severity`, and `drillHref` for each case. Drill hrefs are validated against a regex (no malformed query params).
- `tests/unit/data/acred/peers.test.ts` — peer fixture shape parses against `PeerDispersionSchema`. Dispersion arithmetic matches the row's mark list.
- `tests/unit/data/acred/amm.test.ts` — AMM fixture shape parses against `AmmFeedSchema`. The capacity-gate label matches the actual gating logic.
- `tests/unit/components/portfolio-table.test.tsx` — given a fixture list, renders the right number of rows, the ACRED row routes to `/datasets/ds_acred`, peer rows route to `/datasets/ds_<id>`.
- `tests/unit/components/red-flag-scoreboard.test.tsx` — given two tripped + six untripped rules, shows exactly two cards with severity-correct styling.
- `tests/unit/components/counterfactual-calculator.test.tsx` — slider input → recomputed max-swap-size matches the closed-form.

### E2E (Playwright)

One new spec, `tests/e2e/acred-monitoring-brief.spec.ts`:

1. Sign in as the demo allocator persona.
2. Visit `/datasets`. Assert: 5 rows present, ACRED row shows non-zero NAV and a non-empty attestation cell.
3. Click ACRED row. Land on `/datasets/ds_acred`. Assert: brief header is visible (not the legacy overview's MetricCard grid).
4. Assert: each of the 6 vital tiles is present with a number; the delta arrow is rendered. Critical: the `nonAccrualPct` tile carries a warning tone (real ACRED data shows non-accrual > 1.4%).
5. Assert: red-flag scoreboard shows at least one tripped rule (depends on facts.ts content — but the spec is authored from the same facts, so this is deterministic).
6. Click a red flag's drill link. Land on `/datasets/ds_acred/explore?...` with the Explore grid filtered. Assert: grid row count matches the rule's expected drill set (e.g., 12 non-accrual holdings).
7. Return to brief. Click "Draft DD memo". Land in `/notebooks/new?...`. Assert: prefill title contains "ACRED Q1 2026".
8. Navigate to `/datasets/ds_acred/amm`. Assert: four AMM tiles render, NAV value present, CI present.
9. Wait 6 seconds. Assert: NAV value changed (interval working).
10. Slide the counterfactual calculator. Assert: max-swap-size changed monotonically.
11. Console: zero `[descriptor-drift]` warnings throughout.

### Visual loop

Every component in `components/features/brief/`, `components/features/portfolio/`, `components/features/amm/` is iterated via the `visual-fix` skill during implementation. The brief, portfolio table, and AMM panel each get one explicit screenshot + a `ui-design-reviewer` pass before being marked complete.

## Risks and open questions

- **Server-side ACRED computation.** The brief is a server component but ACRED's truth lives in client-only DuckDB-WASM. The static `facts.ts` and pre-computed `anomalies.ts` resolve this by trading freshness for renderability. Risk: if the parquet evolves, the facts file drifts. Mitigation: a Vitest spec parses facts.ts against the real ACRED descriptors at unit-test time.
- **Mocked side panels reading as real.** Peer dispersion and attestation discipline are visually prominent but unsourced. Every demo-mocked panel must carry a `<Badge tone="muted">demo</Badge>` element and a tooltip explaining the data source. Slice 1 includes a brief footer disclosure: *"Peer marks and attestation discipline are illustrative until peer-fund integration and live SLA tracking ship."*
- **Drill href stability.** Red-flag rules hard-code Explore-tab filter query strings. Risk: explore tab's query-param shape changes and breaks every drill silently. Mitigation: one E2E step per drill-link kind (step 6 above), plus a small unit suite that asserts the URL builder helpers (in `red-flags.ts`) produce schema-valid hrefs.
- **AMM tab visible on a "dataset" surface.** Conceptually awkward — the AMM is a *consumer* of the dataset, not part of it. Slice 1 accepts this as a pragmatic placement; slice 3 may promote `/amm` to a top-level route once it's wired to real signals.
- **Branching `/datasets/[id]` on `id === 'ds_acred'`.** Deliberate. ACRED is the only asset with real data, and a polymorphic dispatch would be over-engineered for one branch. Slice 2 introduces a `datasetKind` field on `Dataset` and dispatches on that instead.
- **Persona switching.** Stub auth allows persona switch via the existing role-switch UI. Slice 1 does not gate any surface by persona — Persona 2's AMM tab is visible to everyone for demo flow. Slice 3 introduces per-persona gating.
- **5-Cs memo workspace.** Out of scope for slice 1 — "Draft DD memo" jumps to the existing compose surface with a title prefill. The 5-Cs structure (Character / Capacity / Capital / Collateral / Conditions) becomes slice 2's spec.

## Implementation order (input for writing-plans)

1. Zod schemas (`Delta`, `BriefSnapshot`, `RedFlag`, `AnomalyEvent`, `PeerMark`, `PeerDispersionRow`, `AttestationDiscipline`, `AmmFeed`); `DatasetSchema.briefSnapshot?` extension.
2. ACRED facts + anomalies + red-flag rule library; unit tests for facts shape and each red-flag rule.
3. Peer / discipline / AMM fixtures; unit tests for shape.
4. New mock endpoints in `lib/api/endpoints/datasets.ts`.
5. `<DeltaTile>`, `<DeltaCell>`, `<AttestationCell>` building blocks; component unit tests.
6. `<RedFlagScoreboard>`, `<AnomalyFeed>`, `<PeerDispersionPanel>`, `<AttestationDisciplineTile>`, `<DrillOutActions>`, `<BriefHeader>`; component unit tests where state matters.
7. ACRED brief assembly in `app/(app)/datasets/[datasetId]/page.tsx` with `ds_acred` branch.
8. `<PortfolioTable>` swap in `app/(app)/datasets/page.tsx`; visual-fix iteration on the portfolio list.
9. `<AmmOpsPanel>` + tiles + counterfactual + anomaly stream; AMM route + loading skeleton; visual-fix iteration on AMM.
10. Layout: AMM tab in `[datasetId]/layout.tsx` (ACRED-only).
11. E2E spec covering portfolio → brief → drill → memo → AMM.
12. Final typecheck / lint / build / E2E pass.
