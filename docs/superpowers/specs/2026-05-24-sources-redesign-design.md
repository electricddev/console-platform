# Sources redesign — design

**Date:** 2026-05-24
**Author:** Douwe (brainstormed with Claude)
**Status:** Approved, ready for implementation plan
**Route:** `/sources` (originator)
**Supersedes:** `2026-05-21-connector-view-design.md` (the canvas approach)

## Goal

Replace the canvas-based `/sources` page with a tabbed shell + focused Plaid-Link-style add-source modal. The canvas mashed two jobs — *configure* and *monitor* — into one spatial surface and ended up reading as an engineering tool (Airbyte/Fivetran), not a premium financial product (Plaid/Stripe/Mercury).

The redesign separates the jobs:

- **Connected tab** — the directory of *my* sources, density-first list, health-glanceable.
- **Catalogue tab** — the directory of *available* providers, browse-first.
- **Add-source modal** — a focused, branded, multi-step flow that runs the same `Auth → Trust → Discover → Confirm → Done` sequence for every provider type.
- **Manage drawer** — a right-side panel for inspecting existing connections.

The signature moment is the new **Trust step** — a single screen, per provider, that tells the operator exactly what Hyve will do with their data, in their language, with serif headline + operator key-value rows.

## Product test

Per `CLAUDE.md`: would a fund operator (Securitize Fund Services, Maple Trade Finance BD, CLO admin) use this to **configure** or **monitor** their data pipeline? Yes:

- **Configure:** connect Stripe in 30 seconds without reading a manual; configure S3 in 2 minutes with helper text and a sample-data preview.
- **Monitor:** scan a list of 7–20 sources and see at a glance which need attention; click any row to open a drawer with sync history, dataset list, credentials state, and pause/reconnect/remove actions.

Operator tooling. Not analytics. Not interpretation.

## Decisions (recorded from brainstorming)

| # | Decision | Why |
|---|---|---|
| 1 | Drop the canvas entirely | Wrong shape for premium fintech; mashed two jobs |
| 2 | Two-tab page: `Connected` + `Catalogue` | Separates "my sources" from "available providers"; both are first-class |
| 3 | Plaid-Link-style focused modal for add-flow | Branded, scoped, ceremonial — matches premium-fintech mental model |
| 4 | Dedicated Trust step in the flow | The signature trust moment; replaces buried badges/page links |
| 5 | Sample-data preview on Confirm step | Premium signal; "know what you're getting" before commit |
| 6 | Stripe + Plaid + QuickBooks + Xero mock-wired | Showcase OAuth flow on real-feeling provider names |
| 7 | One unified flow shape (OAuth + form + file all share chrome) | Cheaper to build, consistent operator experience, content varies |
| 8 | Operator-with-serif-headline temperament | Matches existing v2 voice; serifs add warmth without marketing-prose drift |
| 9 | One-PR rebuild (Approach A) | Pre-launch, no users, canvas is one week old; clean diff > transitional state |

## Scope

**In scope:**

- New `/sources` page shell (`<SourcesShell>`), URL-synced tab state.
- `Connected` tab — list view + controls strip (search/filter/sort) + empty state.
- `Catalogue` tab — categorised browse view with state-aware provider cards.
- `AddSourceModal` — picker vestibule + 5-step flow (Auth → Trust → Discover → Confirm → Done).
- `ManageDrawer` — right-side detail panel for existing connections.
- Trust copy per connector (in `catalog-data.ts`).
- Mock-wired Stripe, Plaid, QuickBooks, Xero (Hyve Bridge-style honest fake OAuth).
- Sample-data preview on Confirm step (5 redacted rows per dataset; object-list variant for non-tabular).
- Catalogue additions: `Payments`, `Banking`, `Accounting` categories.
- Full E2E test rewrite.
- Deletion of canvas-specific components in the same commit.

**Out of scope (explicit non-goals):**

- Real Stripe / Plaid / QB / Xero OAuth — only mocked, fixture-fed.
- Real Rust-API integration — fixtures throughout.
- Real PII redaction logic — fixtures rendered redacted by hand.
- Full sync-cadence editor — single hidden Advanced toggle on Confirm.
- Webhook configuration UI — `HTTP webhook` stays "Coming soon."
- Multi-account-per-provider (e.g. two Stripe accounts).
- `/vaults/[id]/sources` per-vault binding — separate spec.
- Catalogue fuzzy/semantic search — simple name-contains is enough.
- Sources health widget on the Overview page — separate spec.

## Page architecture

### Shell

```
┌─ Sources ───────────────────────────── [+ Connect a source] ┐
│                                                              │
│  Connected · 7    Catalogue                                  │  ← segmented tabs
│  ─────────────                                               │
│                                                              │
│  <tab content>                                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Header: `Sources` (Instrument Serif, ~30px) + one-line subtext (`7 sources feeding 18 datasets`) + primary CTA `+ Connect a source` (forest-green).
- Tabs: `Connected` (default, count badge) and `Catalogue`. URL-synced via `?tab=catalogue`.

### Two entry points to the add-flow

- **Header CTA** opens `AddSourceModal` at the picker vestibule (search bar + compact grid). Pick → modal animates into Auth step.
- **Click a Catalogue card** opens `AddSourceModal` with that provider preselected, skipping the picker.

The picker is a vestibule, not a step. The 4-step stepbar (`Connect · Review · Discover · Confirm`) does not show on the picker.

### Manage existing → drawer, not modal

Click a row on Connected → right-side drawer (~480px) slides over the list. Different chrome for "manage" vs "add."

## The AddSourceModal

### Container

- Centred, ~560px × dynamic height (~640px typical, ≤80vh).
- Backdrop: 60% black + 2px blur.
- Dismissible: backdrop click does nothing on Auth, Discover, Confirm (prevents accidental loss of credentials); Escape always works and triggers an "Abandon setup?" confirm if state would be lost. Trust and Done steps are dismissible freely.
- Provider chip top-left (logo + name + identifier-in-mono), close `×` top-right.
- Footer: `[Cancel link]` left, `[Continue →]` right (forest-green primary).

**Stepbar labels vs internal step keys.** User-facing labels and internal state keys differ:

| Stepbar label | Internal `step` key |
|---|---|
| Connect | `auth` |
| Review | `trust` |
| Discover | `discover` |
| Confirm | `confirm` |
| *(hidden — stepbar collapses)* | `done` |

The picker vestibule has no stepbar at all. Done collapses the stepbar (success screen sits on its own).

### Step 0 — Picker vestibule (CTA entry only)

- Search bar focused on open (existing `⌘K` shortcut binds here).
- Below: compact grid of provider chips grouped by category (~80×80, logo + name).
- Click a chip → modal animates in-place (no remount) into Step 1.

### Step 1 — Connect (Auth)

Renders one of three sub-shapes inside the same modal chrome:

- **OAuth shape** (Stripe, Plaid, QuickBooks, Xero): big `Sign in with Stripe →` button as the primary action; short paragraph above explains what happens. Mock-wired: click opens the in-modal Hyve Bridge interstitial (see §"Hyve Bridge") that returns to Step 2 on Approve.
- **Credential form shape** (S3, SFTP, Snowflake, Databricks): existing form pattern from `auth-step.tsx`, split into "Required" and "Advanced (click to expand)" sections.
- **File upload shape** (CSV/Parquet): large dropzone fills the body; on drop, file parses inline and shows inferred schema; `Continue` → Step 2 (effectively pass-through for files).

`Cancel` link confirms if any fields are dirty.

### Step 2 — Review (Trust) — the signature step

- Headline (Instrument Serif, ~22px): *"What Hyve will do with your `<Provider>` data."*
- Below: four key-value rows. Same four rows for every provider; content per-provider:
  - **Reads** — what Hyve reads, with scope (e.g. `charges, invoices, customers · last 24 months · read-only`)
  - **Storage** — confidential-enclave statement
  - **Audit** — ledger / hash statement
  - **Revoke** — how to disconnect
- Footer-left link: `Full data handling policy` (stub `/legal/data-handling` for now).
- Primary CTA: `Continue →`.

Copy comes from `catalog-data.ts` per connector — treated as product copy, not boilerplate. **The Trust step lives or dies on the `Reads` line being specific.**

Type sketch for the Trust extension to `ConnectorDefinition`:

```ts
type ConnectorDefinition = {
  // existing fields…
  trust?: {
    reads: string    // "charges, invoices, customers · last 24 months · read-only"
    storage: string  // "Confidential enclave. Hyve operators cannot read raw. Every query signed."
    audit: string    // "Hash of every read written to ledger. Counterparty access logged."
    revoke: string   // "Pause or disconnect from Sources. Effective immediately."
  }
}
```

`catalog-data.test.ts` asserts every wired (non-"Coming soon") connector has all four fields set.

### Step 3 — Discover

Reuse existing `discovery-step.tsx` verbatim, renamed to `discover-step.tsx`. The narrated check-by-check pattern is genuinely the strongest piece of the current code:

```
✓ Connecting to Stripe
✓ Listing endpoints
◐ Sampling schemas
○ Counting recent rows
```

Extend the `PROFILES` map with entries for `stripe`, `plaid`, `quickbooks`, `xero`.

### Step 4 — Confirm (with sample preview)

Extends existing `select-step.tsx` (renamed `confirm-step.tsx`):

1. Each dataset row gets a chevron — click expands to show 5 sample rows, PII-redacted (`••• ••• ••12`-style) in a tight mono mini-table inside the expanded row.
2. Header pill: `5 of 5 selected · ~187K rows / month estimated`.
3. Hidden "Advanced" toggle reveals a single `Sync every: [5 min ▾]` control.
4. Primary CTA: `Connect Stripe →` (uses provider name).

For non-tabular datasets (e.g. `borrower_packets` PDFs), the sample preview is an object list (name · size · date for 5 sample objects) instead of a row table.

### Step 5 — Done

Success screen:

```
       ✓
   Stripe connected.
   5 datasets · first sync in 2 minutes.

   [ Go to connection ]   [ Add another ]
```

- Auto-dismisses to Connected tab after 6s if no action.
- Connected tab row flashes (~1.5s soft ring pulse).
- `Go to connection` opens the Manage drawer for the new row.
- `Add another` resets the modal to the picker vestibule.

### Hyve Bridge (mock OAuth)

A stylised in-modal interstitial that *deliberately* does not impersonate the provider. The frame is Hyve chrome with the provider's logo and a clear "Authorize Hyve to read your `<Provider>` account" headline + scope list + Approve/Deny.

```
┌─ Hyve Bridge ─────────────────────────────────┐
│                                                │
│  [S] Stripe                                   │
│      acct_1Hyve24                              │
│                                                │
│  Authorize Hyve to read this Stripe account.   │
│                                                │
│  Hyve will be able to read:                    │
│    • Charges                                   │
│    • Invoices                                  │
│    • Customers                                 │
│    • Refunds                                   │
│    • Subscriptions                             │
│                                                │
│  Hyve will not be able to:                     │
│    • Move money                                │
│    • Modify any record                         │
│    • Access API keys                           │
│                                                │
│  [Deny]                       [Approve →]      │
└────────────────────────────────────────────────┘
```

Honest > fake. Pattern is Pyth/Plaid-style "authorization frame." Approve → Step 2; Deny → Step 1 with inline error.

## Connected tab

### List

Row (~72px):

```
[logo] <connection name>                          ● <status word>
       <identifier · mono>  ·  <datasets summary>   synced <ts>
```

- Hover: subtle background tint + right-edge `›`.
- Click: opens Manage drawer.
- Status dot: dot + shape variant (filled / ring / square / hollow) so colour-blind users get a redundant signal.

Controls strip above:

- Left: search (filters by name + identifier).
- Middle: `[All ▾]` filter (status or category).
- Right: `Sort: Last sync ▾`.

### Empty state

```
No sources connected yet.
Start with one of these →   [Stripe] [Plaid] [S3] [SEC EDGAR] [Browse all]
```

First four chips deep-link to AddSourceModal at Auth for that provider. `Browse all` switches to Catalogue.

### Manage drawer

```
┌─ Stripe ──────────────────── [×]
│  acct_1Hyve24  ·  ● healthy
│
│  HEALTH
│  Connected since Mar 12 · 5 datasets · cadence 5min
│  Last sync: 2 minutes ago
│  Last hash: 0x8a3f…b21c  [↗ ledger]
│
│  DATASETS
│  ●  charges            187K rows / mo
│  ●  invoices            12K rows / mo
│  ●  customers            4K rows / mo
│  ●  refunds              1K rows / mo
│  ●  subscriptions          2K rows / mo
│
│  CREDENTIALS
│  OAuth · refreshed Mar 12 · expires Sep 12
│
│  ACTIONS
│  [Pause]    [Reconnect]    [Remove…]
└─
```

- Section labels in small uppercase kicker.
- Dataset rows link to `/datasets/[id]`.
- `Pause` → status paused.
- `Reconnect` → AddSourceModal at Auth step, pre-filled.
- `Remove…` → existing inline "type-the-name-to-confirm" pattern, transplanted from `source-tile-expanded.tsx`.

## Catalogue tab

### Layout

```
┌─ Filter: [Payments] [Banking] [Accounting] [Fund admin] [Regulator] [Storage] [Warehouse] [On-chain] [Market data] [Custom]
│  Search: __________________
├──────────────────────────────────────────────────────────────────
│  PAYMENTS
│  ┌──────────┬──────────┬──────────┬──────────┐
│  │ [Stripe] │ [Adyen]  │ [Plaid]  │ [Square] │   ← cards ~200×112
│  │ Stripe   │ Adyen    │ Plaid    │ Square   │
│  │ Charges, │ Soon     │ Banking  │ Soon     │
│  │ invoices │          │ data     │          │
│  └──────────┴──────────┴──────────┴──────────┘
│  …
```

Card states (badge bottom-right):

- *(none)* — wired, click → AddSourceModal at Auth.
- `Coming soon` — unwired, click → small toast `<Provider> is coming soon. Want it sooner? Email hello@hyve.xyz`.
- `Connected · N` — already connected, click → switch to Connected tab, flash row.

### Categories (post-redesign)

| Category | Connectors |
|---|---|
| **Payments** *(new)* | **Stripe** ★, Adyen, **Plaid** ★, Square, Braintree |
| **Banking** *(new)* | **Plaid** ★, MX, Teller |
| **Accounting** *(new)* | **QuickBooks** ★, **Xero** ★, NetSuite, Sage Intacct |
| Fund admin | **SFS**, Securitize Platform, Allvue, SS&C Advent, Northern Trust |
| Regulator | **SEC EDGAR** (wired), CFTC, FCA, BaFin |
| Storage | **S3** (wired), GCS, Azure Blob, SFTP, **File upload** (wired) |
| Warehouse | Snowflake, BigQuery, Databricks, Redshift |
| On-chain | Wormhole, RedStone, Pyth, Chainlink CCIP, Morpho |
| Market data | Bloomberg, LSEG, Markit, S&P CIQ |
| Rating agency | Moody's, S&P, Fitch, DBRS, KBRA |
| Agent bank | Alter Domus, Virtus, IQ-EQ, Apex |
| Analytics | RWA.xyz, Dune, Token Terminal, DeFiLlama |
| Custom | HTTP webhook, REST poller, Generic CSV |

★ = mock-wired with full Hyve Bridge OAuth flow + fixtures. **Bold** = wired today, survives unchanged.

(Plaid appears in both Payments and Banking — same connector, listed in both filters. Treat as a single entry indexed twice by category.)

## File layout

```
app/(originator)/sources/
  page.tsx                       # unchanged shape; fetches fixtures, renders <SourcesShell>
  actions.ts                     # EXTEND: add reconnectConnection; keep create/pause/remove
  loading.tsx                    # existing
  error.tsx                      # existing

components/v2/features/sources/
  index.ts
  sources-shell.tsx              # NEW. Tabbed page; URL-synced tab state inline (no separate hook).
  catalog-data.ts                # EXTEND. Payments/Banking/Accounting categories; Stripe/Plaid/QB/Xero
                                 #         entries; per-provider Trust copy.
  fixtures.ts                    # EXTEND. Mock OAuth-connected fixtures + sample rows.

  connected/
    connected-tab.tsx            # NEW. List + controls strip + empty state. ≤150 LOC.
    connection-row.tsx           # NEW. Row anatomy with status-dot shape variants.

  catalogue/
    catalogue-tab.tsx            # NEW. Filter chips + search + categorised grid.
    catalogue-card.tsx           # NEW. Provider card with state-aware badge.

  manage-drawer/
    manage-drawer.tsx            # NEW. Single file; sections inline until file exceeds ≈250 LOC.

  add-source-modal/
    add-source-modal.tsx         # NEW. Modal shell — owns picker vestibule + step routing + close-confirm.
    picker-view.tsx              # NEW. Vestibule provider grid + search.
    stepbar.tsx                  # NEW. 4-step indicator.
    hyve-bridge.tsx              # NEW. Stylised in-modal mock-OAuth interstitial.
    steps/
      auth-step.tsx              # ADAPT from setup/auth-step.tsx — render OAuth | Form | FileUpload sub-shape.
      trust-step.tsx             # NEW. Signature step; pulls Trust copy from catalog-data.ts.
      discover-step.tsx          # REUSE from setup/discovery-step.tsx (rename + extend PROFILES).
      confirm-step.tsx           # EXTEND from setup/select-step.tsx — sample-preview, estimate pill, rename CTA.
      done-step.tsx              # NEW. Success view with 6s auto-dismiss timer.
    setup-reducer.ts             # EXTEND from setup/setup-reducer.ts — add 'trust' and 'done' states.
    field-schemas.ts             # EXTEND from setup/field-schemas.ts — stripe/plaid/quickbooks/xero schemas.
    sample-rows.ts               # NEW. Per-provider 5-row redacted fixtures + non-tabular variants.

  hooks/
    use-add-source-modal.ts      # NEW. Open/close, step nav, URL ?add= sync.
    use-manage-drawer.ts         # NEW. Open/close keyed on connection id.
```

### Deleted in the same commit (no archive, no `/legacy` move)

```
components/v2/features/sources/
  sources-canvas.tsx
  source-tile.tsx
  source-tile-expanded.tsx
  dataset-tile.tsx
  vault-peripheral-tile.tsx
  canvas-edges.tsx
  category-lane.tsx
  floating-action-bar.tsx
  legend.tsx
  empty-state.tsx                                # replaced by Connected-tab empty state
  catalog-sheet.tsx                              # replaced by Catalogue tab
  hooks/use-canvas-layout.ts
  hooks/use-catalog-sheet.ts
  hooks/use-setup-flow.ts                        # superseded by use-add-source-modal.ts
  inspector/                                     # ENTIRE folder — replaced by manage-drawer/
  setup/                                         # ENTIRE folder — files migrated under add-source-modal/steps/
```

Existing E2E test `tests/e2e/sources.spec.ts` is fully rewritten — see Testing.

## State & data flow

### Server

`page.tsx` reads fixtures, passes to `<SourcesShell>`. Unchanged shape — when we wire the Rust API later, this becomes a `fetch`.

### Client (`<SourcesShell>`) — one `useReducer`

```ts
type ShellState = {
  tab: 'connected' | 'catalogue'           // mirrored to ?tab=
  modal: ModalState                         // mirrored to ?add= and ?step=
  drawerConnectionId: string | null         // mirrored to ?manage=
  flashConnectionId: string | null          // for the post-Done highlight
}

type ModalState =
  | { kind: 'closed' }
  | { kind: 'picker' }
  | { kind: 'flow'
      connectorId: string
      step: 'auth' | 'trust' | 'discover' | 'confirm' | 'done'
      authPayload: Record<string, unknown>
      discovered: DiscoveredDataset[]
      selected: string[] }
```

URL is the source of truth for tab, modal open/step, and drawer. `authPayload` is **not** persisted to URL — sensitive; refresh kicks back to Auth.

### Mutual exclusivity

Only one of `modal !== closed` or `drawerConnectionId !== null` may be true at any moment. Opening one closes the other (state-machine guarantee, not a UI guard).

### Setup reducer migration

The existing `setup-reducer.ts` is extended, not rewritten. Changes:

| Existing state | Action |
|---|---|
| `'idle'` | **Removed** — modal closed = no reducer mounted |
| `'auth'` | Kept |
| `'discovering'` | **Renamed** to `'discover'` |
| `'select'` | **Renamed** to `'confirm'` |
| `'submitting'` | Kept (transient between `confirm` and `done`) |
| `'error'` | Kept |
| `'done'` | Kept |
| *(new)* `'trust'` | **Added** between `auth` and `discover` |

New transitions: `submitAuth → trust` (was `submitAuth → discovering`); add `submitTrust → discover`. All other action shapes unchanged.

### Server actions

`createConnection`, `pauseConnection`, `resumeConnection`, `removeConnection` survive unchanged. Add `reconnectConnection(id, newAuthPayload)`.

## Motion

Match v2 framer-motion vocabulary (see `vault-sidebar-nav.tsx`, prior `add-data-source-dialog.tsx`).

| Moment | Duration | Easing |
|---|---|---|
| Modal open (backdrop + content) | 240ms | `[0.25, 0.1, 0.25, 1]` |
| Step transition (within modal) | 220ms cross-fade + 4px y-offset | easeOut |
| Picker → Auth (provider chosen) | 320ms | spring `{ stiffness: 280, damping: 32 }` |
| Drawer open | 280ms | `[0.25, 0.1, 0.25, 1]` |
| Tab switch | 180ms cross-fade | linear |
| Sample-preview row expand | 200ms `height: auto` | easeOut |
| Done auto-dismiss | 6s timer, 280ms exit | easeIn |
| New-row flash (post-Done) | 1.4s ring-opacity pulse | sine |

All animations respect `prefers-reduced-motion` (framer-motion handles it automatically).

## Accessibility

- **Modal** uses shadcn `<Dialog>` (radix) — focus-trap + Esc + `aria-labelledby` for free. Initial focus: primary CTA on most steps; search on Picker; first input/button on Auth.
- **Drawer** uses shadcn `<Sheet>`.
- **Tabs** use shadcn `<Tabs>` — arrow-key nav.
- **Status dots** have a redundant shape variant (filled / ring / square / hollow); each row has `aria-label="<Provider> — <status>, <N> datasets, last synced <ts>"`.
- **Stepbar** = `<ol aria-label="Setup progress">` with `aria-current="step"`.
- **Trust step** rows = `<dl>`, read as "Reads: charges, invoices, customers, last 24 months, read-only."
- **Sample preview** = small `<table>` with `<th scope="col">`.
- **Hyve Bridge interstitial** = nested `role="dialog"`; focus moves to Approve on open.

## Error handling

- **Auth failure** — stay on Auth; inline error above form/button (`aria-live="polite"`); preserve typed values.
- **Discovery failure** — transition to fail-variant of Discover; the failing check turns red with one-line error; row of `[Try again] [Cancel]`. Reuses existing `'error'` state in `setup-reducer`.
- **Save failure** — stay on Confirm; toast + inline banner; primary CTA re-enables.
- **Network offline** — modal banner top, all actions disabled, restored on reconnect.

## Edge cases

| Case | Handling |
|---|---|
| Deep-link `?add=stripe` | Skip picker, open at Auth for Stripe |
| Close mid-discovery | Discovery aborts; state discarded |
| Refresh mid-flow | URL restores step; `authPayload` cleared; user re-enters credentials |
| Catalogue click for already-connected provider | Switch to Connected tab, flash the row |
| Discovery returns 0 datasets | Confirm shows empty state: "Nothing to ingest. Check scopes and try again." |
| Hyve Bridge "Deny" | Returns to Auth with inline message |
| Drawer `Remove` while modal open for same connector | `Remove` disabled with tooltip |
| Escape with dirty Auth fields | "Abandon setup?" confirm |
| Non-tabular dataset sample preview | Object list (name · size · date) instead of row table |

## Performance budget

- **LCP < 2.5s** — Sources page is a Server Component; `<SourcesShell>` hydrates with inline data.
- **Modal lazy-loaded** — `add-source-modal/` via `next/dynamic`; only paid for after first `+ Connect a source` click.
- **Drawer rendered always** but `aria-hidden` + display:none until open — lighter than dynamic import at this size.
- **No popup window** for OAuth — Hyve Bridge is inline.
- **Discovery** is cosmetic-only (fixture-driven); no real network cost.

## Testing

### Unit

- `setup-reducer.test.ts` — extend with `'trust'` and `'done'` transitions.
- `catalog-data.test.ts` — assert every wired provider has Trust copy for all four rows (Reads, Storage, Audit, Revoke).
- `confirm-step.test.ts` — sample preview renders for tabular and object-list variants; estimate pill formats correctly.
- `add-source-modal.test.ts` — step navigation, close-confirm guard, mutual exclusivity with drawer.

### E2E (`tests/e2e/sources.spec.ts` — full rewrite)

- Tab switch deep-link (`?tab=catalogue` resolves correctly).
- CTA → picker → pick → Auth → Trust → Discover → Confirm → Done (OAuth path).
- Catalogue card → AddSourceModal at Auth (picker skipped).
- Manage drawer open from row click, close via Escape, close via outside-click.
- Pause / Reconnect / Remove paths from drawer.
- Hyve Bridge Approve and Deny paths.
- Refresh mid-flow restores step (auth cleared).
- Already-connected Catalogue card switches to Connected with row flash.

## Implementation order

1. **Shell + tabs.** `<SourcesShell>` with both tabs renderable, URL sync, header + CTA wired (CTA opens a stub modal). Demo: page renders, tabs switch, URL stays in sync.
2. **Connected tab.** List + row + controls strip + empty state. Read from fixtures. No drawer yet.
3. **Catalogue tab.** Filter chips + search + grid + card states. Click does nothing yet.
4. **AddSourceModal shell.** Modal container, stepbar, close-confirm guard, picker vestibule. No step content.
5. **Trust step.** Pull copy from `catalog-data.ts`, render rows, primary CTA.
6. **Auth step (adapted).** Three sub-shapes — OAuth button, form (existing), file upload. Wire S3 + file-upload + SEC EDGAR as before.
7. **Discover step.** Migrate `discovery-step.tsx` with renamed PROFILES.
8. **Confirm step.** Extend `select-step.tsx` with sample preview, estimate pill, rename CTA. Add `sample-rows.ts` fixtures.
9. **Done step.** Success view + auto-dismiss + row-flash on Connected.
10. **Hyve Bridge.** In-modal mock-OAuth interstitial; wire Stripe, Plaid, QuickBooks, Xero through it.
11. **Manage drawer.** Health / Datasets / Credentials / Actions sections. Pause / Reconnect / Remove paths.
12. **Catalogue wiring.** Click states (wired / coming-soon / connected) hooked to modal/tab actions.
13. **Catalogue extensions.** Add Payments, Banking, Accounting categories + new providers to `catalog-data.ts`.
14. **Delete canvas code.** Remove all canvas-era files in this commit. Verify build green.
15. **A11y pass.** Status-dot shapes, ARIA labels, focus order, reduced-motion check.
16. **E2E rewrite.** Replace `sources.spec.ts` with the new flows.

Each step is independently demoable. Steps 1–4 produce a shell that can be reviewed before steps 5+ commit to the modal-step semantics.

## Risks

| Risk | Mitigation |
|---|---|
| Hyve Bridge looks too fake → premium-feel investment wasted | Build it as honest Hyve chrome with provider logo, not a Stripe impersonation. Pattern is Plaid/Pyth authorization frame. |
| Catalog at 40+ providers becomes a wall | Category filter + search + "Connected" badge sort-to-top. |
| Trust copy reads as generic ("encrypted in transit") | Per-connector copy in `catalog-data.ts`. The `Reads` line must be specific. Reviewer signs off on copy before ship. |
| Drawer + Modal collision | Mutual-exclusivity guaranteed at the state-machine level. |
| Loss of the canvas's "spatial pipeline" demo appeal | Accept; the pipeline visual lives in the Overview page DAG (separate spec). Sources is for managing, not visualising. |
| Folder rename (`setup/` → `add-source-modal/steps/`) inflates diff | Acceptable; renames are clear in PR review and the semantic improvement is worth it. |
| One-PR canvas deletion is irreversible without git | Acceptable; the canvas is one week old, no production users, git history preserves it. |

## Open decisions deferred to implementation

- Exact card dimensions on viewports < 1280w (likely 3-up grid → 2-up).
- Whether the Catalogue tab supports keyboard arrow-key navigation between cards (probably yes; defer the binding details).
- Exact tone of the "Coming soon" toast (TBD wording — "want it sooner?" CTA is the intent).
- Whether `Pause` requires a confirmation step (probably no — reversible).
- Whether the Hyve Bridge interstitial supports a "Sign in with a different account" path (probably no for MVP — single account per provider).

---

**Next step:** invoke `writing-plans` skill to produce the implementation plan.
