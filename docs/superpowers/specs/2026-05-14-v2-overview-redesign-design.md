# v2 Overview redesign — design spec

**Date:** 2026-05-14
**Author:** brainstorm with douwe@thehyve.xyz
**Predecessor:** `app/v2/page.tsx` + `components/v2/features/overview/*`
**Status:** approved, ready for implementation plan

---

## 1. Goal

Rebuild `/v2` so it reads as an operator's mission control for a tokenized
fund's data layer (ACRED · Apollo Diversified Credit). The DAG is the page;
the right rail is a contextual side panel that answers _what needs my
attention_ by default and morphs into provenance / output detail on click.

Two questions an operator must answer in under three seconds:

1. Is ACRED's data layer healthy right now?
2. What is the live NAV and when does the next attestation publish?

Both are answered by the DAG itself (status dots, output node, countdown in
rail). The rail does not duplicate them.

## 2. Audience

- **Primary:** Securitize operator. Lands here daily; needs density,
  glanceable status, and one-click access to provenance.
- **Secondary:** Auditors, Apollo, DeFi protocols looking at the data
  layer. Needs the view to be cryptographically legible and demoable.

No charts. No historical NAV. No TVL. No DeFi-app visualisation. Air
traffic control, not Dune.

## 3. Page composition

Page lives inside the existing `V2Shell` (sidebar + `InteractiveGrid`
background — both untouched). Main content layout:

```
// OVERVIEW                            as of HH:MM:SS UTC
ACRED · Apollo Diversified Credit                  ● Live
─────────────────────────────────────────────────────────
                                          ┌─────────────┐
   DAG canvas — naked on the grid          │  glass rail │
   (no border, no fill, grid dots          │   ~320px    │
    visible through the canvas)            │             │
                                           │             │
                                           └─────────────┘
```

- **Page header (top)** — one row. Eyebrow `// OVERVIEW` + as-of timestamp
  right-aligned (mono, muted). Below the eyebrow: fund name `ACRED` in
  Instrument Serif 28px (the existing header serif treatment is kept) +
  " · Apollo Diversified Credit" tertiary subtitle, with `● Live` pill
  right-aligned. This header is the only place fund identity lives.
- **DAG canvas** — fills the remaining width minus the rail. No border,
  no fill, no inset padding-frame. Sits directly on the page background;
  the grid pattern is visible through it. React Flow's own dot background
  is removed (the page grid is enough).
- **Right rail** — fixed-width 320px, full height of the content area.
  Glass surface (see §9 for treatment discipline). Hairline 1px border at
  low opacity. One soft warm aura bottom-left to give the panel gravity
  (single blob, restrained).

The current 4-tile KPI strip is removed entirely. Its values move into
the DAG (live values on `pub-pershare` and `pub-attest` nodes) and into
State C of the rail.

## 4. Right rail — three states

The rail has three states. Transitions are 160ms cross-fades, content
reflowed within the same surface (no slide-over panel).

### 4.1 State A — Idle (default)

Three blocks, separated by hairline dividers at low opacity. No card
frames within the rail.

**Block 1 · Next attestation**

- Eyebrow "Next attestation" — 10px upper, tracking, muted.
- Countdown: `36:55` mono 22px tabular-nums. Colon pulses once per second
  (skipped under `prefers-reduced-motion`).
- Caption: "publishing to N chains" 11px tertiary, where N is derived
  from `pub-attest.data.consumerDeliveries.length`.

**Block 2 · Stage health**

- Eyebrow "Stage health".
- One row, inline: `● 12 attested  ◐ 2 pending  ◯ 0 failed`. Dots use the
  status colours (`--v2-success` / `--v2-warning` / `--v2-danger`).
  Counts derived from the pipeline fixture.
- Hovering a token (e.g. "2 pending") dims unrelated DAG nodes for the
  duration of the hover.

**Block 3 · Needs your attention**

- Eyebrow "Needs your attention".
- Up to **5 rows**, ranked. See §5 for ranking and copy rules.
- If the queue is empty: a single 11px muted line "Nothing needs attention".
- If the queue exceeds 5 items: render 4 + an `+N more` pill that
  navigates to `/v2/alerts`.

### 4.2 State B — Node selected (any non-output node)

Cross-fades in from State A. Contents:

- Top row: `←` back button + node title (e.g. "Position valuation") +
  status pill (`Attested` / `Pending` / `Failed`).
- Description paragraph.
- `Inputs` section — definition list of `node.data.inputs`.
- `Output` section — definition list of `node.data.output`, accented.
- `Provenance` section — signing key, proof type, reference.
- `Schedule` section — cadence, last run (absolute UTC), next run.

This is the existing `NodeDetailPanel` content, rendered into the rail
surface instead of a separate sibling panel. The standalone panel
component is deleted.

### 4.3 State C — Output node selected (`pub-attest`)

Same shell as State B (back / title / status pill / description) plus two
additional sections specific to the output node:

- **Live NAV** — Total NAV (Instrument Serif 28px), per-share (mono 14px
  secondary), as-of UTC timestamp (mono 11px tertiary). This is the only
  place display serif appears in the page.
- **Consumer deliveries** — definition-list-style rows for each entry in
  `pub-attest.data.consumerDeliveries`:
  - chain name + network (e.g. `Morpho · mainnet`)
  - last delivery (e.g. `14:23 · 3m ago`)
  - payload reference (mono, truncated)

The remaining standard sections (Inputs / Output / Provenance / Schedule)
still render below — `pub-attest` is a normal pipeline node with extras,
not a special-case panel.

## 5. Attention queue

The queue surfaces items the operator can't see by looking at the DAG.
Items come from two sources merged together:

**Pipeline-derived (computed at render time):**

- Any node with `status === 'failed'`
- Any pipeline-blocking pending stage (i.e. a pending node on the path
  to `pub-attest`)
- Held attestation: `pub-attest` itself when `status === 'pending'`

**Static (mocked in fixture as `attention[]`):**

- Counterparty requests (e.g. new DeFi protocol asking for NAV access)
- Rule fires (e.g. an alert threshold crossed)

### Ranking

Strict priority order (no aggregation):

1. `failed` (pipeline)
2. `pending` blocking output (pipeline)
3. `held` attestation (pipeline — `pub-attest` pending)
4. `counterparty_request` by age, newest first
5. `rule_fire` by age, newest first

Cap the list at 5 rows. If more, render 4 + `+N more` → `/v2/alerts`.

### Row copy

Compact, parsable. Format: `<label> · <one-liner detail or age>`.

Examples:

- `Reconciliation · 2 breaks · $4,217 net`
- `Attested publish · held by reconciliation`
- `Aave V4 requesting NAV access · 1h`
- `NAV move > 0.5% intraday · 14:03`

Each row has a leading status glyph in the row's accent colour
(red / amber / muted). Rows are buttons:

- Pipeline rows select the corresponding DAG node (rail flips to State B
  or C).
- Counterparty rows navigate to `/v2/counterparties`.
- Rule fire rows navigate to `/v2/rules` or `/v2/alerts`.

## 6. DAG — visual language

### Nodes

The current 180×~70 cards become **chip-tablets**:

- ~155px wide × ~52px tall.
- Hairline 1px border at ~50% opacity. **No fill** (transparent). Grid
  dots show through.
- Status dot at the left edge, ~6px diameter, with a soft radial glow in
  the status colour (low alpha — see §9).
- Single-line label, Geist Sans medium 13px. Truncate with ellipsis.
- Footer row: cadence left (mono 10px muted), last-run-ago right
  (mono 10px muted). Always visible — operators need density.
- No "ATTESTED / PENDING / FAILED" pill text on the node itself
  (the dot speaks; the rail confirms in State B).
- No per-node phase eyebrow.

### Publish-column nodes — value-bearing footer

The two publish-column nodes carry live values in their footer, in place
of the cadence + age treatment, so the DAG itself surfaces the operator's
"what is the NAV" answer without a separate hero:

- **`pub-pershare`** — footer reads `$103.4719` (mono 11px) on the left
  and last-run age on the right. Cadence is dropped from the footer for
  this node; it's "every 15m" and reading it on every render is noise.
- **`pub-attest`** — footer reads `$1,247,318,402` (mono 11px) on the
  left and `next 36:55` on the right (mono tabular-nums, live tick).
  This is THE live NAV + countdown the operator scans for; the rest of
  the rail does not duplicate it.

All other nodes keep the standard cadence + age footer.

### Layout

- Keep the five-column phase layout (`source`, `validate`, `value`,
  `aggregate`, `publish`) — `phase` stays in the data model as a layout
  hint.
- **Remove column header labels** (no `SOURCE · VALIDATE · VALUE ·
  AGGREGATE · PUBLISH` row above the canvas). The labels duplicated what
  the nodes already convey by position and name, and the abstraction
  didn't match the actual operations (validation happens at ingest;
  "VALUE" reads awkwardly).

### Edges

- Keep smoothstep, 1.25px, current colour.
- On node-selection, edges incident to the selected node get a subtle
  animated dot-trail (3s loop). Other edges remain static.
- Reduced-motion disables the trail.

### States

- Hover: border ink-up + 1px lift.
- Selected: stronger border + soft warm aura ring around the node
  (single blob, restrained per §9).
- Failed: permanent soft red aura (same restraint).

## 7. Interaction model

- Click node → rail → State B (or C if `pub-attest`).
- Click attention row (pipeline kind) → same as clicking that node.
- Click attention row (counterparty / rule kind) → navigate to the
  relevant page.
- Click DAG pane or rail "← back" → rail → State A.
- Hover "2 pending" / hover attention row → dim unrelated DAG nodes for
  the duration of the hover.
- Keyboard: nodes are buttons, tabbable in phase order; Enter selects;
  Esc returns to State A. Rail in State B/C: Esc / back is keyboard-
  accessible.
- Live tick: countdown updates every 1s, suppressed under
  `prefers-reduced-motion`.

## 8. Data model changes

`components/v2/features/overview/pipeline-types.ts` and
`pipeline-fixture.ts` get the following additions:

- `PipelineNodeData` (only for `pub-attest`, optional on the type) gains:
  ```ts
  consumerDeliveries?: {
    name: string         // "Morpho"
    network: string      // "mainnet"
    lastDeliveryAt: string  // ISO
    payloadRef: string   // "0xa412…b8de"
  }[]
  ```
- `PipelineFixture` gains:
  ```ts
  attention: AttentionItem[]
  ```
  where
  ```ts
  type AttentionItem =
    | { kind: 'counterparty_request', label: string, detail: string, at: string, href: string }
    | { kind: 'rule_fire',            label: string, detail: string, at: string, href: string }
  ```
  Pipeline-derived items (failed / pending-blocking / held) are computed
  at render time from existing node status, not stored.

Fixture data for State C and queue:

- `pub-attest` carries 3 consumer deliveries: Morpho (mainnet), Gauntlet
  (mainnet), RedStone (oracle), all delivered 3m ago.
- `attention` carries 1 counterparty request (Aave V4 NAV access · 1h)
  and 1 rule fire (NAV move > 0.5% intraday · 14:03).
- Existing pending nodes (`src-trades`, `val-recon`) + the held
  `pub-attest` populate the top of the queue.

## 9. Visual treatment discipline

The user flagged glass, display serif, and aura glows as "AI-slop tells"
but elected to keep them, secondary to the structural revision. Execute
all three with restraint:

- **Glass (rail only):** backdrop-blur ≤ 12px; surface tint ≤ 8% of
  `--v2-surface`; border opacity ≤ 12%. One single aura blob per surface
  — never stacked.
- **Display serif (Instrument Serif 28px):** appears in two places only —
  the fund name in the page header (existing treatment, kept) and the
  Total NAV value in rail State C. The two serifs rhyme; no other display
  serif on the page.
- **Aura glows:** light-mode alpha ≤ 0.18 at centre; dark-mode alpha
  ≤ 0.30 at centre. Used in three places only:
  - Rail bottom-left (default state)
  - Selected DAG node ring (warm tint)
  - Failed DAG node (red tint)
  All other current aura usage (KPI strip, node-detail panel) is removed
  because those surfaces are removed.

Tokens stay on the existing v2 scope (`--v2-*`). No new colours.

## 10. Edge cases

- All-green pipeline: `● Live` pill stays "Live" (no extra text); stage
  health reads `● 14 attested · ◐ 0 · ◯ 0`; attention queue likely shows
  only non-pipeline items or "Nothing needs attention".
- Pipeline has failures: Live pill becomes `● Live · 1 failed` (red
  dot). Attention queue surfaces the failed node at the top.
- `pub-attest` is failed (not just pending): State C still renders Live
  NAV (last known good) with a "stale" flag on the as-of timestamp.
- Empty `consumerDeliveries`: State C shows "No subscribed consumers" in
  the consumer deliveries section.
- Empty `attention` and no pipeline issues: "Nothing needs attention"
  muted line.

## 11. Out of scope

- Historical NAV chart, TVL, allocator-facing analytics. Not on this
  page, not ever.
- Marketing landing page changes (`hyve.xyz` site). Different surface,
  different repo concerns.
- Other `/v2` routes (sources, datasets, schemas, rules, consumers,
  counterparties, audit, alerts). They are linked from the attention
  queue but their UI is unchanged in this work.
- Real-time data wiring (everything stays on the fixture for now).
- Mobile/responsive: current shell already collapses below `md`; the
  rail stacks below the DAG on narrow screens. Detailed mobile pass is
  a follow-up.

## 12. Acceptance criteria

A reviewer should be able to verify all of the following on `/v2`:

1. Page has a single header line with `// OVERVIEW`, fund name,
   as-of timestamp, and Live pill. No 4-tile KPI strip below.
2. DAG canvas has no card frame; the page grid pattern is visible
   through it; nodes are chip-tablets (no fill, hairline border, status
   dot at left, label, cadence + age footer).
3. No phase column headers above the DAG (no `SOURCE · VALIDATE · …`).
4. Right rail in default state shows only: countdown, stage health,
   attention queue. No NAV, no fund identity, no consumer list.
5. Clicking a non-output node morphs the rail into State B with
   description + Inputs / Output / Provenance / Schedule.
6. Clicking `pub-attest` morphs the rail into State C with Live NAV
   (display serif), Consumer deliveries, and the standard B sections
   below. Before the click, `pub-attest`'s own footer already shows the
   NAV value and the countdown.
7. Attention queue is ranked per §5, capped at 5, "+N more" links to
   `/v2/alerts`.
8. Hovering "N pending" or a pipeline attention row dims unrelated DAG
   nodes.
9. Keyboard nav: Tab through nodes, Enter selects, Esc returns to A.
10. `prefers-reduced-motion`: colon pulse, edge trails, and aura
    pulses are suppressed.

## 13. Files touched

Expected scope of the implementation:

- `app/v2/page.tsx` — minor (still renders `<Overview />`).
- `components/v2/features/overview/overview.tsx` — rewritten (new
  composition, new rail).
- `components/v2/features/overview/pipeline-graph.tsx` — small (drop
  React Flow background dots, keep layout, add edge-trail animation on
  selection).
- `components/v2/features/overview/pipeline-node.tsx` — rewritten as
  chip-tablet.
- `components/v2/features/overview/node-detail-panel.tsx` — deleted;
  contents migrate into a new rail component.
- `components/v2/features/overview/kpi-strip.tsx` — deleted.
- `components/v2/features/overview/card-aura.tsx` — kept but lower
  default intensities (see §9).
- `components/v2/features/overview/pipeline-fixture.ts` — augment
  `pub-attest` with `consumerDeliveries`; add `attention[]`.
- `components/v2/features/overview/pipeline-types.ts` — type additions.
- New: `components/v2/features/overview/rail.tsx` (the three-state rail
  shell).
- New: `components/v2/features/overview/rail-attention-queue.tsx`,
  `rail-node-detail.tsx`, `rail-output-detail.tsx` — the three state
  bodies, composed by `rail.tsx`.
- New: `components/v2/features/overview/attention.ts` — derivation
  + ranking of pipeline-derived attention items, merge with static
  `attention[]`, cap.
- `app/v2/v2.css` — possibly small additions (keyframes for edge-trail
  if not done in component).
