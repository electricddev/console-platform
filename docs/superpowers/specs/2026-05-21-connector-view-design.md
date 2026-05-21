# Connector view — design

**Date:** 2026-05-21
**Author:** Douwe (brainstormed with Claude)
**Status:** Approved, ready for implementation plan
**Route:** `/sources` (originator)

## Goal

Replace the legacy modal-driven source picker with a single canvas surface where fund operators see their entire ingestion pipeline at a glance, add new connections without leaving the surface, and configure them inline. The "Snowflake-2010" wizard pattern is the antipattern; Railway's spatial workspace is the inspiration.

## Product test

Per `CLAUDE.md` — would a fund operator (Securitize Fund Services, Maple Trade Finance BD, CLO admin) use this to **configure** or **monitor** their data pipeline? Yes:
- **Configure:** add a new SFS connection, point at an S3 bucket of borrower packets, hook in SEC EDGAR.
- **Monitor:** "are all my data feeds healthy? when did the SFS NAV last land? what's broken?"

This is operator tooling. Not analytics. Not interpretation.

## Scope

**In scope (this spec):**
- The `/sources` canvas page (originator-wide pool)
- Source tiles, dataset tiles, peripheral vault tiles
- Auto-layout across three lanes (sources → datasets → vaults)
- Hairline static edges (animated pulse is a deferred enhancement)
- Categorized catalog as a bottom sheet
- Inline-on-canvas setup (auth → discovery → select → save)
- Inline-on-canvas inspector for existing connections (detail, pause, reconnect, remove)
- Empty state
- Keyboard navigation, a11y

**Out of scope (follow-on specs):**
- `/vaults/[id]/sources` — per-vault binding from the pool
- Live sync pulse animation on edges
- Pan/zoom controls (deferred until usage requires it)
- Drag-to-reposition (likely never)
- Catalog search (categories suffice for v1)
- Wiring every connector — MVP wires **SEC EDGAR** (already done), **S3**, and **File upload**. The rest appear in the catalog as "Coming soon," matching the existing pattern.

## Architecture: the canvas

### Three lanes, left to right

| Lane | Width | Contents |
|---|---|---|
| Sources | ~30% | Connection tiles, grouped vertically by category |
| Datasets | ~30% | One tile per dataset, placed adjacent to parent source |
| Vaults | ~25% | Peripheral; non-interactive context. Click → navigate to `/vaults/[id]` |

The remaining ~15% is breathing room between lanes — generous gutter is the design.

### Auto-layout (no dragging)

The system, not the user, arranges tiles. Rules:

1. **Sources cluster by category** (Fund admin, Regulator, Storage, Warehouses, On-chain, Market data, Rating agencies, Agent banks, Analytics, Custom). Each category has a faint uppercase kicker label.
2. **Within a category, sources sort by name ascending.**
3. **Datasets sit adjacent (vertically) to their parent source.** This is the visual grouping — adjacency replaces edge labeling.
4. **Vaults cluster by which datasets they consume**, minimizing edge crossings via barycentric ordering.
5. **No state is persisted per user** — the layout is deterministic from the data. Refresh = same layout.

The layout calculation lives in `use-canvas-layout.ts` and runs synchronously on the client from the connection list. Output: an array of `{ id, kind, x, y, w, h }` items + an array of `{ from, to, kind, status }` edges.

### Edges

- **Default:** 1px stroke, `linear-gradient(transparent → muted-2 at 45% opacity → transparent)`. Reads as a hint, not a line.
- **Errored:** amber gradient (`#b58400` at 60% opacity).
- **On tile hover:** related edges thicken to 1.5px and saturate to 70% opacity. All other tiles dim to 60% opacity.
- **Animated pulse:** out of scope for MVP. The static gradient already implies flow direction.

Edges are rendered as a single SVG layer covering the whole canvas (`<svg class="edges" viewBox="0 0 W H">`), with paths computed from the layout output. Curves: `M x1 y1 C x1+gap y1, x2-gap y2, x2 y2`.

### Tile anatomy

**Source tile (compact, ~260 × 50 px):**
```
[logo 26px] Securitize Fund Services      [status dot]
            3 datasets · synced 2m ago
```

**Dataset tile (compact, ~175 × 40 px):**
```
[glyph]  nav.daily
         38.4K rows · 2m
```

**Vault tile (peripheral, ~175 × 80 px):**
```
[swatch] ACRED
Securitize · Apollo · production
8 datasets   3 consumers
```

The only color is the status dot and the vault swatch. Everything else is monochrome on `--v2-surface`. Logos use the existing `Wordmark` / `TileLogo` patterns from `add-data-source-dialog.tsx`.

### Floating action bar

Bottom-center, ~340 × 36 px pill:
```
[+ Add connector]   [⌘K Find ⌘K]   [Fit view]
```
- "Add connector" opens the catalog sheet.
- "⌘K" is the keyboard shortcut to the same.
- "Fit view" zooms-to-fit when the canvas has been zoomed (deferred behavior — for MVP this is inert or hidden).

### Legend

Bottom-right, ~280 × 22 px:
```
● healthy   ● attention   ● error   ● paused
```

## The setup interaction (the "kill the modal" moment)

The user adds a new connector. No dialog opens. The flow is one continuous gesture across the canvas.

### Sequence

1. **Trigger:** click "+ Add connector" or press `⌘K`.
2. **Catalog rises.** A bottom sheet (~50vh tall) slides up from the canvas floor. The canvas behind dims to 50% opacity but stays visible. The sheet contains:
   - Horizontal category tabs (Fund admin, Regulator, Storage, Warehouses, On-chain, …)
   - Grid of connector cards (logo + name + tagline; "Soon" pill for unwired)
   - Escape / outside-click closes the sheet without commitment
3. **Pick.** User clicks a connector card.
4. **Sheet collapses.** A pending tile materializes in the canvas at its category slot, with a soft pulse treatment (`motion-safe:animate-pulse` on the border ring). Neighbors politely reflow to make room.
5. **Tile auto-expands** into a configuration card (~480 × 360 px). Surrounding tiles shift further to accommodate. The expanded tile shows a 3-step progress strip at the top: **Connect → Discover → Confirm**.
6. **Step: Connect (auth).** Fields specific to the connector type. The form is one tight column inside the expanded tile (or two columns for heavy configs like Snowflake).
7. **Step: Discover.** When the user clicks "Continue," the tile transitions to a narrated discovery state — borrowing the exact pattern from the existing SEC EDGAR loading view (`SecLoadingView` in `add-data-source-dialog.tsx`): a stack of checks like "Connecting to bucket," "Listing prefixes," "Sampling schemas," each with a spinner that resolves to a check.
8. **Step: Confirm.** Datasets discovered. Same UI pattern as `SecDatasetsView` — a grid of dataset cards with checkbox-pressed states, cadence, row count, coverage. Default: all selected.
9. **Save.** Server action `createConnection(...)`. On success:
   - Expanded tile contracts back to compact form.
   - New dataset tiles appear in the middle lane (animated `opacity 0 → 1, x: -8 → 0`).
   - Edges grow from source → datasets (path animation: `pathLength 0 → 1` over 400ms).
   - Status dot transitions to green.

### Why this works

- **Spatial continuity.** No context switch. The new connection appears exactly where it will live forever.
- **Progressive disclosure inside one surface.** The 3-step strip chunks complexity without spawning sub-modals.
- **Reuses proven patterns.** The discovery and dataset-selection steps reuse the existing `SecLoadingView` and `SecDatasetsView` patterns — they were already the strongest parts of the legacy dialog.
- **Recoverable.** Setup state lives in URL search params (`/sources?add=snowflake&step=auth`) so a refresh resumes mid-flow.

### Heavy configs

Snowflake / Databricks-style connectors have 8–14 fields. The expanded tile supports a 2-column layout in the Connect step. If still too tight, the expanded tile widens to 640px (neighbors keep shifting). We do not fall back to a modal under any circumstance.

## The inspector interaction (existing connections)

User clicks an existing source tile. Same expansion animation as setup, but the expanded card shows detail instead of configuration:

```
[logo] Securitize Fund Services                 [status dot] [X]
       NAV · fund admin

Health
  Connected · 3 datasets · synced 2m ago · cadence: 5min poll

Datasets
  ● nav.daily            38.4K rows   2m ago
  ● positions.snapshot  412K rows    2m ago
  ● flows.subscriptions   2.1K rows  2m ago

Credentials
  OAuth · refreshed 2025-12-04 · expires 2026-06-04

Actions
  [Pause]  [Reconnect]  [Remove]
```

- Dataset rows link to `/datasets/[id]`.
- "Pause" toggles the connection without removing it (status → paused, edges dim).
- "Reconnect" jumps back into the setup flow at the Connect step, pre-filled.
- "Remove" requires confirmation (inline, not a modal — a "Type the connection name to confirm" inline prompt within the card).
- Click outside or press Escape collapses back to the compact tile.

## Empty state

No connections yet. The canvas has only the peripheral vault tiles on the right (very faded, ~40% opacity). The center is dominated by a single call-to-action card:

```
        Connect your first data source

   [SFS]  [S3]  [SEC EDGAR]  [File upload]
        Pick one to get started, or browse the catalog →
```

Clicking any of the four quick picks jumps directly into the setup flow for that connector. "Browse the catalog →" opens the bottom sheet.

## Catalog content (v1)

The bottom sheet shows these categories. Wired (functional) connectors are bolded; unwired show "Soon" — same pattern as the existing `CATALOG` array in `add-data-source-dialog.tsx`.

| Category | Connectors |
|---|---|
| Fund admin | **SFS · Securitize Fund Services**, Securitize Platform, Allvue, SS&C Advent, Northern Trust, BNY Mellon, State Street |
| Regulator | **SEC EDGAR**, CFTC, FCA filings, BaFin |
| Storage | **S3**, GCS, Azure Blob, SFTP, **File upload** |
| Warehouses | Snowflake, BigQuery, Databricks, Redshift |
| On-chain | Wormhole, RedStone, Pyth Network, Chainlink CCIP, Morpho |
| Market data | Bloomberg, LSEG / Refinitiv, Markit, S&P Capital IQ |
| Rating agencies | Moody's, S&P, Fitch, DBRS, KBRA |
| Agent banks | Alter Domus, Virtus, IQ-EQ, Apex Group |
| Analytics | RWA.xyz, Dune, Token Terminal, DeFiLlama |
| Custom | HTTP webhook, REST poller, Generic CSV |

**MVP wires three:** SEC EDGAR (existing logic survives), **S3** (new wire), **File upload** (new wire). The rest are "Soon" — visible so the operator sees the platform's intent.

## File layout

```
app/(originator)/sources/
  page.tsx                      # server component; fetches connections, renders canvas
  actions.ts                    # server actions: createConnection, pauseConnection, removeConnection, etc.
  loading.tsx                   # subtle skeleton
  error.tsx                     # canvas-wrapped error

components/v2/features/sources/
  index.ts                      # public exports
  sources-canvas.tsx            # client; orchestrates layout, state, edges
  source-tile.tsx               # compact tile (canvas)
  source-tile-expanded.tsx      # expanded card (inspector + setup share the shell)
  dataset-tile.tsx
  vault-peripheral-tile.tsx
  canvas-edges.tsx              # SVG edge layer
  category-lane.tsx             # vertical category section with kicker label
  catalog-sheet.tsx             # bottom sheet with categorized connectors
  catalog-data.ts               # connector catalog (categories, logos, field schemas)
  floating-action-bar.tsx
  empty-state.tsx
  legend.tsx
  setup/
    setup-shell.tsx             # 3-step strip + step routing
    auth-step.tsx               # form per connector type
    discovery-step.tsx          # reuses SecLoadingView pattern
    select-step.tsx             # reuses SecDatasetsView pattern
    setup-reducer.ts            # auth → discovery → select → save state machine
    field-schemas.ts            # Zod schemas per connector type
  hooks/
    use-canvas-layout.ts        # auto-layout algorithm
    use-catalog-sheet.ts        # open/close state + ⌘K binding
    use-setup-flow.ts           # URL-synced setup state
  fixtures.ts                   # ACRED demo data (sources, datasets, vaults)
```

### Component boundaries

- **`sources-canvas.tsx`** is the orchestrator. It owns: selected tile id, catalog sheet open/closed, pending setup state. It renders all the lanes, edges, and the floating bar. ~150 LOC ceiling — if it grows past that, split into `canvas-shell.tsx` + `canvas-state.tsx`.
- **`source-tile-expanded.tsx`** is the shared shell for both inspector and setup. It accepts a `mode` prop: `'inspect' | 'setup'`. The setup mode renders `setup/setup-shell.tsx`; the inspect mode renders a detail layout.
- **`catalog-sheet.tsx`** is a self-contained subtree; the canvas tells it "open" / "closed" via prop, and it emits a `connectorId` on selection.
- **`use-canvas-layout.ts`** is a pure function wrapped in `useMemo`. Takes connections + datasets + vaults → returns positioned items + edges. Testable in isolation.

## State & data flow

### Data

```
Connection = {
  id, type, name, status: 'ok' | 'attention' | 'error' | 'paused',
  lastSyncAt, datasetCount, credentialsExpireAt?
}
Dataset = {
  id, sourceId, name, rowCount, lastSyncAt, vaultIds: string[]
}
VaultRef = {
  id, symbol, sponsor, palette, datasetCount, consumerCount
}
```

Server fetches via existing `lib/api/client.ts`; schemas added to `lib/api/schemas.ts` and validated with Zod. For MVP, all data comes from `fixtures.ts` (no backend dependency — matches the demo-first pattern in this repo).

### Client state

`sources-canvas.tsx` uses a single `useReducer` for canvas-level state:

```ts
type CanvasState = {
  selectedTileId: string | null   // expanded inspector
  catalogOpen: boolean
  setup: SetupState | null         // pending new connection (also mirrored to URL)
}
```

Setup state is mirrored to URL search params via `useSetupFlow()` so a refresh resumes mid-flow.

### Server actions

- `createConnection(input)` — called at end of setup
- `pauseConnection(id)`
- `resumeConnection(id)`
- `removeConnection(id, confirmName)`
- `reconfigureConnection(id, input)`

All wrapped in `try/catch` with toast feedback via the existing sonner integration (`components/ui/sonner.tsx`, mounted in `app/layout.tsx`).

## Animation specifics

Match the existing v2 framer-motion vocabulary (see `vault-sidebar-nav.tsx`, `add-data-source-dialog.tsx`).

| Moment | Duration | Easing |
|---|---|---|
| Tile expand (setup or inspector) | 280ms | `[0.25, 0.1, 0.25, 1]` |
| Tile contract | 220ms | `[0.25, 0.1, 0.25, 1]` |
| Catalog sheet slide-up | 320ms | `[0.25, 0.1, 0.25, 1]` |
| Catalog sheet dismiss | 220ms | linear |
| Edge grow (new dataset) | 400ms `pathLength` | easeOut |
| New dataset tile fade-in | 260ms | easeOut, with `delay = index * 30ms` for a soft cascade |
| Neighbor tile reflow | 260ms | spring `{ stiffness: 280, damping: 32 }` |
| Pulse on pending tile | infinite, 1400ms | sine |

All animations respect `prefers-reduced-motion` — framer-motion does this automatically; we only need to ensure we don't set `initial={{}}` without `transition: { duration: 0 }` fallback.

## Accessibility

- **Canvas is keyboard-navigable.** Tab traversal order: top→bottom within sources lane, then datasets lane, then vaults. The order is computed from the layout output and applied via `tabIndex={0}` on tiles.
- **Enter / Space** on a focused tile expands it. **Escape** collapses.
- **⌘K (Ctrl+K on non-mac)** opens the catalog. The bottom sheet traps focus until dismissed; first focus lands on the first category tab.
- **All tiles have `aria-label`** with name + status: `aria-label="Securitize Fund Services — healthy, 3 datasets, synced 2 minutes ago"`.
- **Status dots are not color-only.** Use distinct visual treatments alongside color: healthy = solid filled dot, attention = ring with center, error = filled square (smaller), paused = hollow ring. Each has a tooltip with the status word.
- **Edges have no semantic role** — they are decorative `<path role="presentation">`. The relationship is also reflected in the tile's `aria-label` ("3 datasets") and the dataset tile's `aria-describedby` pointing at the parent source.
- **Form fields** in setup use the existing v2 form patterns (label + input + helper text); errors announced via `aria-live="polite"`.
- **`prefers-reduced-motion`** respected throughout.

## Performance budget

- LCP < 2.5s: server component renders the canvas shell + tile positions on the server; client hydrates for interactivity.
- INP < 200ms for tile expand: framer-motion with `layout` would be tempting but expensive at this scale; use explicit width/height/x/y animations on `motion.div` instead, which keep the canvas at 60fps even with 30+ tiles.
- Bundle: catalog sheet content is dynamically imported (`next/dynamic`) so it loads only on first open.
- Edges SVG: single `<svg>` element with `<path>` per edge. 50 edges = trivial; we don't need a graph library.

## Edge cases

| Case | Handling |
|---|---|
| Source with 0 datasets (newly added, pre-discovery) | Tile shows "Discovering…" in subtitle; no edges yet |
| Source with > 8 datasets | Datasets render as a scroll-stack within their adjacent space; tile gets a "(N total)" indicator |
| Connection in `error` state | Tile dot is red; edges to its datasets turn amber-red; clicking opens inspector with the error message and a "Reconnect" CTA |
| Credentials expiring soon (< 7d) | Dot is amber; subtitle reads "credentials expiring in Nd" |
| No vaults yet | Right lane is empty; canvas centers itself on sources + datasets |
| > 25 sources | MVP behavior: the canvas grows in height and the page scrolls vertically. Tiles do not shrink. Pan/zoom controls and auto-zoom-out are explicitly deferred to a follow-on spec — observe usage before adding them. |
| User closes browser mid-setup | URL params persist setup state; on return, the same expanded tile reopens at the same step |

## Implementation order

1. **Foundation:** route, layout file, fixtures, page skeleton.
2. **Canvas shell:** `sources-canvas.tsx` + `use-canvas-layout.ts` + tiles (compact only). No interaction yet — just see the rest-state canvas with fixtures.
3. **Edges:** SVG layer, hairline static.
4. **Floating action bar + legend + empty state.**
5. **Catalog sheet:** open/close, categories, connector cards. Selecting a connector does nothing yet.
6. **Inspector:** click an existing tile → expand → detail view. Pause/Resume/Remove actions.
7. **Setup flow:** catalog selection → pending tile → setup-shell → auth → discovery → select → save. Wire SEC EDGAR first (reuse existing logic), then S3, then File upload.
8. **URL-synced setup state:** survive refresh mid-flow.
9. **A11y pass:** keyboard nav, aria labels, reduced motion.
10. **Visual polish pass:** animations, hover states, status dot variants.

Each step is independently demoable.

## Risks

- **Auto-layout edge cases.** With many sources and few datasets (or vice versa), barycentric ordering may produce ugly crossings. Mitigation: ship with a simple algorithm; refine with real data. The category-lane structure prevents the worst cases.
- **Setup tile feels cramped for Snowflake.** Mitigation: 2-column auth layout + 640px widening. If still bad, fall back to a side-sheet (NOT a modal) for that specific connector — but only after observing actual usage.
- **Reuse of `add-data-source-dialog.tsx` patterns.** The existing file is in `components/features/sources/` (v1 style); the new code lives in `components/v2/features/sources/`. We extract the shared SEC discovery + dataset-select patterns into the new location and either delete the old file or leave it for `(app)/legacy/*` routes. **Decision:** lift the patterns into the new location; the legacy `(app)/legacy/sources` route keeps using the old file unchanged.
- **Demo-first data.** All MVP data is fixture-based; backend integration is out of scope. The `actions.ts` server actions can stub responses or call existing legacy endpoints where present.

## Open decisions deferred to implementation

- Exact dimensions of the expanded card on smaller viewports (< 1280w). Likely: collapse the vault lane on the canvas, expanded card uses full datasets+vaults width.
- Whether to surface a "Recent activity" rail bottom-right of the canvas. Deferred — start clean.
- Tooltip / hover-card content on dataset tiles. Start minimal (name + rows + freshness); add detail on demand.

---

**Next step:** invoke writing-plans skill to produce the implementation plan.
