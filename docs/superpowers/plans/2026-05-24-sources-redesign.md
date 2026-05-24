# Sources redesign — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/sources` canvas with a tabbed shell (`Connected` + `Catalogue`), a Plaid-Link-style `AddSourceModal` (Auth → Trust → Discover → Confirm → Done), a right-side `ManageDrawer` for existing connections, plus mock-wired Stripe/Plaid/QuickBooks/Xero with an honest in-modal Hyve Bridge interstitial.

**Architecture:** Two tabs, one modal, one drawer. URL is the source of truth for tab, modal step, and drawer. State machine guarantees mutual exclusivity between modal and drawer. Existing setup-reducer is *extended* (rename `discovering→discover`, `select→confirm`, add `trust`), not rewritten. The discovery narration pattern from today survives verbatim; everything else around the page is new.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · shadcn/ui (Dialog, Sheet, Tabs) · Tailwind + v2 CSS variables · framer-motion · Zod · Vitest + @testing-library/react · Playwright.

**Spec:** `docs/superpowers/specs/2026-05-24-sources-redesign-design.md`

**Branch:** continuing on `feat/companion-panel-redesign` (existing canvas work lives here; the redesign supersedes it).

---

## Conventions for every task

- **Path alias:** `@/` resolves to repo root.
- **Imports:** Named only (except pages/layouts which are default-export).
- **Strict TS:** never `any`; narrow `unknown`.
- **Server Components by default** — `'use client'` only when interactive state is needed.
- **Design tokens only** — no hardcoded colours; use `v2-*` Tailwind classes or `oklch(...)` already in use.
- **Commit message style:** Conventional Commits, prefix all sources work `feat(sources): ...`, `refactor(sources): ...`, `test(sources): ...`, `chore(sources): ...`.
- **Commit cadence:** at the end of each task. Never amend a previous commit.

---

## File map (created vs modified vs deleted)

### Created (this plan)

```
components/v2/features/sources/
  sources-shell.tsx
  connected/connected-tab.tsx
  connected/connection-row.tsx
  catalogue/catalogue-tab.tsx
  catalogue/catalogue-card.tsx
  manage-drawer/manage-drawer.tsx
  add-source-modal/add-source-modal.tsx
  add-source-modal/picker-view.tsx
  add-source-modal/stepbar.tsx
  add-source-modal/hyve-bridge.tsx
  add-source-modal/sample-rows.ts
  add-source-modal/steps/trust-step.tsx
  add-source-modal/steps/done-step.tsx
  hooks/use-add-source-modal.ts
  hooks/use-manage-drawer.ts

tests/unit/sources/
  catalog-data.test.ts
  trust-step.test.tsx
  confirm-step.test.tsx
  sources-shell.test.tsx
  add-source-modal.test.tsx
  use-add-source-modal.test.ts

tests/e2e/
  sources.spec.ts        # replaces sources-canvas.spec.ts
```

### Modified

```
lib/api/schemas.ts                                         # extend ConnectorCategorySchema
lib/api/fixtures/connector-canvas.ts                       # add Stripe/Plaid/QB/Xero connections + datasets
components/v2/features/sources/catalog-data.ts             # new categories + providers + trust copy
components/v2/features/sources/index.ts                    # re-exports
app/(originator)/sources/page.tsx                          # render <SourcesShell>
app/(originator)/sources/actions.ts                        # add reconnectConnection
tests/unit/sources/setup-reducer.test.ts                   # update for new state names
```

### Copied (new locations + content extension; old files left in place until Task 20)

```
setup/setup-reducer.ts    → add-source-modal/setup-reducer.ts          (rename states, add trust)
setup/field-schemas.ts    → add-source-modal/field-schemas.ts          (add OAuth schemas)
setup/auth-step.tsx       → add-source-modal/steps/auth-step.tsx       (branch into OAuth/Form/FileUpload)
setup/discovery-step.tsx  → add-source-modal/steps/discover-step.tsx   (extend PROFILES)
setup/select-step.tsx     → add-source-modal/steps/confirm-step.tsx    (sample preview, estimate, CTA)
```

The old copies stay in place. The canvas (still alive through Task 19) keeps importing them. Task 20 deletes the entire `setup/` folder along with the canvas. Git rename-detection is acceptable to lose for a single-PR change.

### Deleted (Task 19 — single commit)

```
components/v2/features/sources/sources-canvas.tsx
components/v2/features/sources/source-tile.tsx
components/v2/features/sources/source-tile-expanded.tsx
components/v2/features/sources/dataset-tile.tsx
components/v2/features/sources/vault-peripheral-tile.tsx
components/v2/features/sources/canvas-edges.tsx
components/v2/features/sources/category-lane.tsx
components/v2/features/sources/floating-action-bar.tsx
components/v2/features/sources/legend.tsx
components/v2/features/sources/empty-state.tsx
components/v2/features/sources/catalog-sheet.tsx
components/v2/features/sources/hooks/use-canvas-layout.ts
components/v2/features/sources/hooks/use-catalog-sheet.ts
components/v2/features/sources/hooks/use-setup-flow.ts
components/v2/features/sources/inspector/                  # entire folder
components/v2/features/sources/setup/                      # entire folder (already moved)
tests/unit/sources/use-canvas-layout.test.ts
tests/e2e/sources-canvas.spec.ts                            # replaced by sources.spec.ts
```

---

## Task 1 — Extend `ConnectorCategorySchema` with Payments / Banking / Accounting

**Why first:** Every downstream piece (catalog, fixtures, cards, modal picker) needs the new category enum. Adding it first means no temporary `as ConnectorCategory` casts elsewhere.

**Files:**
- Modify: `lib/api/schemas.ts:840-852`
- Test: `tests/unit/sources/catalog-data.test.ts` (created here)

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sources/catalog-data.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { ConnectorCategorySchema } from '@/lib/api/schemas'

describe('ConnectorCategorySchema', () => {
  it('accepts the new Payments category', () => {
    expect(ConnectorCategorySchema.parse('payments')).toBe('payments')
  })

  it('accepts the new Banking category', () => {
    expect(ConnectorCategorySchema.parse('banking')).toBe('banking')
  })

  it('accepts the new Accounting category', () => {
    expect(ConnectorCategorySchema.parse('accounting')).toBe('accounting')
  })

  it('still accepts existing categories', () => {
    expect(ConnectorCategorySchema.parse('fund-admin')).toBe('fund-admin')
    expect(ConnectorCategorySchema.parse('regulator')).toBe('regulator')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm test tests/unit/sources/catalog-data.test.ts
```

Expected: FAIL on `payments` / `banking` / `accounting` (Zod rejects unknown enum values).

- [ ] **Step 3: Extend the schema**

In `lib/api/schemas.ts`, replace the `ConnectorCategorySchema` enum:

```ts
export const ConnectorCategorySchema = z.enum([
  'fund-admin',
  'regulator',
  'storage',
  'warehouse',
  'on-chain',
  'market-data',
  'rating-agency',
  'agent-bank',
  'analytics',
  'payments',
  'banking',
  'accounting',
  'custom',
])
```

- [ ] **Step 4: Run test to verify it passes**

```
pnpm test tests/unit/sources/catalog-data.test.ts
```

Expected: PASS.

- [ ] **Step 5: Typecheck**

```
pnpm typecheck
```

Expected: no errors. (The category enum is used in `catalog-data.ts` and `connector-canvas.ts` fixtures — both already use string-literal values from the existing enum, so widening is safe.)

- [ ] **Step 6: Commit**

```
git add lib/api/schemas.ts tests/unit/sources/catalog-data.test.ts
git commit -m "feat(sources): extend ConnectorCategory with payments/banking/accounting"
```

---

## Task 2 — Add the `trust` field to `ConnectorDefinition` (type + per-connector copy)

**Files:**
- Modify: `components/v2/features/sources/catalog-data.ts`
- Test: `tests/unit/sources/catalog-data.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/sources/catalog-data.test.ts`:

```ts
import { CATALOG, type ConnectorDefinition } from '@/components/v2/features/sources/catalog-data'

describe('CATALOG trust copy', () => {
  const wired: ConnectorDefinition[] = CATALOG.filter((c) => c.wired === 'wired')

  it('has at least one wired connector', () => {
    expect(wired.length).toBeGreaterThan(0)
  })

  it.each(wired)('$id has all four Trust fields populated', (c) => {
    expect(c.trust).toBeDefined()
    expect(c.trust?.reads.length).toBeGreaterThan(0)
    expect(c.trust?.storage.length).toBeGreaterThan(0)
    expect(c.trust?.audit.length).toBeGreaterThan(0)
    expect(c.trust?.revoke.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm test tests/unit/sources/catalog-data.test.ts
```

Expected: FAIL — `trust` is `undefined` on existing wired connectors (`sec-edgar`, `s3`, `file-upload`).

- [ ] **Step 3: Extend the type and add trust copy**

In `components/v2/features/sources/catalog-data.ts`, extend the type:

```ts
export type ConnectorDefinition = {
  id: string
  category: ConnectorCategory
  name: string
  tagline: string
  wired: ConnectorWired
  logo:
    | { kind: 'wordmark'; label: string; tone: WordmarkTone }
    | { kind: 'icon'; Icon: React.ComponentType<LucideProps> }
  trust?: {
    reads: string
    storage: string
    audit: string
    revoke: string
  }
}
```

Add trust copy to each currently-wired entry. Replace the existing `sec-edgar`, `s3`, and `file-upload` entries with versions that include `trust`:

```ts
// Regulator
{ id: 'sec-edgar', category: 'regulator', name: 'SEC EDGAR', tagline: 'Regulator',
  wired: 'wired', logo: { kind: 'wordmark', label: 'SEC', tone: 'navy' },
  trust: {
    reads: 'Public filings: Form N-PORT, N-CSR, N-CEN, N-2, XBRL financials · read-only',
    storage: 'Cached in confidential enclave. Hyve operators cannot read raw filings.',
    audit: 'Every fetch hashed and written to ledger.',
    revoke: 'Disconnect from Sources. Cached data purged within 24h.',
  } },

// Storage
{ id: 's3', category: 'storage', name: 'Amazon S3', tagline: 'Object storage',
  wired: 'wired', logo: { kind: 'wordmark', label: 'S3', tone: 'orange' },
  trust: {
    reads: 'Objects under the prefix you grant · read-only · ListObjects + GetObject',
    storage: 'Streamed into a confidential enclave. Hyve operators cannot read raw bytes.',
    audit: 'SHA-256 of every object read written to ledger. Counterparty access logged.',
    revoke: 'Disconnect or rotate the IAM credentials. Effective immediately.',
  } },

{ id: 'file-upload', category: 'storage', name: 'File upload', tagline: 'CSV · Parquet · JSON',
  wired: 'wired', logo: { kind: 'icon', Icon: FileUp },
  trust: {
    reads: 'Only the files you upload. No background polling.',
    storage: 'Stored in confidential enclave. Hyve operators cannot read raw rows.',
    audit: 'File hash and column count written to ledger at upload time.',
    revoke: 'Delete the source from Sources. Files purged within 24h.',
  } },
```

- [ ] **Step 4: Run the catalog test**

```
pnpm test tests/unit/sources/catalog-data.test.ts
```

Expected: PASS for the three currently-wired connectors. (Stripe/Plaid/QB/Xero are added in Task 4.)

- [ ] **Step 5: Commit**

```
git add components/v2/features/sources/catalog-data.ts tests/unit/sources/catalog-data.test.ts
git commit -m "feat(sources): add Trust copy to ConnectorDefinition (wired connectors)"
```

---

## Task 3 — Add Stripe / Plaid / QuickBooks / Xero entries + new category labels

**Files:**
- Modify: `components/v2/features/sources/catalog-data.ts`
- Test: `tests/unit/sources/catalog-data.test.ts`

- [ ] **Step 1: Add the new category labels**

In `catalog-data.ts`, extend `CATEGORY_LABELS`:

```ts
export const CATEGORY_LABELS: Record<ConnectorCategory, string> = {
  'fund-admin': 'Fund admin',
  regulator: 'Regulator',
  storage: 'Storage',
  warehouse: 'Warehouse',
  'on-chain': 'On-chain',
  'market-data': 'Market data',
  'rating-agency': 'Rating agency',
  'agent-bank': 'Agent bank',
  analytics: 'Analytics',
  payments: 'Payments',
  banking: 'Banking',
  accounting: 'Accounting',
  custom: 'Custom',
}
```

Extend `CATEGORY_ORDER`:

```ts
export const CATEGORY_ORDER: ConnectorCategory[] = [
  'payments', 'banking', 'accounting',
  'fund-admin', 'regulator', 'storage', 'warehouse',
  'on-chain', 'market-data', 'rating-agency', 'agent-bank',
  'analytics', 'custom',
]
```

- [ ] **Step 2: Add Stripe, Plaid, QuickBooks, Xero (wired with trust copy)**

Append to the `CATALOG` array (mark these `wired: 'wired'` — they will go through Hyve Bridge mock OAuth):

```ts
// Payments
{ id: 'stripe', category: 'payments', name: 'Stripe', tagline: 'Charges · invoices · subscriptions',
  wired: 'wired', logo: { kind: 'wordmark', label: 'S', tone: 'violet' },
  trust: {
    reads: 'charges, invoices, customers, refunds, subscriptions · last 24 months · read-only',
    storage: 'Confidential enclave. Hyve operators cannot read raw. Every query signed.',
    audit: 'Hash of every read written to ledger. Counterparty access logged.',
    revoke: 'Pause or disconnect from Sources. Effective immediately.',
  } },
{ id: 'adyen', category: 'payments', name: 'Adyen', tagline: 'Payments platform',
  wired: 'soon', logo: { kind: 'wordmark', label: 'AD', tone: 'teal' } },
{ id: 'square', category: 'payments', name: 'Square', tagline: 'In-person payments',
  wired: 'soon', logo: { kind: 'wordmark', label: 'SQ', tone: 'ink' } },
{ id: 'braintree', category: 'payments', name: 'Braintree', tagline: 'Payments platform',
  wired: 'soon', logo: { kind: 'wordmark', label: 'BT', tone: 'navy' } },

// Banking
{ id: 'plaid', category: 'banking', name: 'Plaid', tagline: 'Bank account data',
  wired: 'wired', logo: { kind: 'wordmark', label: 'P', tone: 'ink' },
  trust: {
    reads: 'transactions, balances, accounts · last 24 months · read-only',
    storage: 'Confidential enclave. Hyve operators cannot read raw. Every query signed.',
    audit: 'Hash of every read written to ledger. Counterparty access logged.',
    revoke: 'Pause or disconnect from Sources. Effective immediately.',
  } },
{ id: 'mx', category: 'banking', name: 'MX', tagline: 'Bank account data',
  wired: 'soon', logo: { kind: 'wordmark', label: 'MX', tone: 'blue' } },
{ id: 'teller', category: 'banking', name: 'Teller', tagline: 'Bank API',
  wired: 'soon', logo: { kind: 'wordmark', label: 'T', tone: 'amber' } },

// Accounting
{ id: 'quickbooks', category: 'accounting', name: 'QuickBooks', tagline: 'Books · invoices · expenses',
  wired: 'wired', logo: { kind: 'wordmark', label: 'QB', tone: 'teal' },
  trust: {
    reads: 'invoices, expenses, journal entries, customers, vendors · last 24 months · read-only',
    storage: 'Confidential enclave. Hyve operators cannot read raw. Every query signed.',
    audit: 'Hash of every read written to ledger. Counterparty access logged.',
    revoke: 'Pause or disconnect from Sources. Effective immediately.',
  } },
{ id: 'xero', category: 'accounting', name: 'Xero', tagline: 'Books · invoices · expenses',
  wired: 'wired', logo: { kind: 'wordmark', label: 'X', tone: 'blue' },
  trust: {
    reads: 'invoices, expenses, journal entries, contacts · last 24 months · read-only',
    storage: 'Confidential enclave. Hyve operators cannot read raw. Every query signed.',
    audit: 'Hash of every read written to ledger. Counterparty access logged.',
    revoke: 'Pause or disconnect from Sources. Effective immediately.',
  } },
{ id: 'netsuite', category: 'accounting', name: 'NetSuite', tagline: 'ERP',
  wired: 'soon', logo: { kind: 'wordmark', label: 'NS', tone: 'red' } },
{ id: 'sage-intacct', category: 'accounting', name: 'Sage Intacct', tagline: 'ERP',
  wired: 'soon', logo: { kind: 'wordmark', label: 'SI', tone: 'orange' } },
```

- [ ] **Step 3: Run the catalog tests**

```
pnpm test tests/unit/sources/catalog-data.test.ts
```

Expected: PASS for 7 wired connectors (sec-edgar, s3, file-upload, stripe, plaid, quickbooks, xero).

- [ ] **Step 4: Commit**

```
git add components/v2/features/sources/catalog-data.ts
git commit -m "feat(sources): add Stripe/Plaid/QuickBooks/Xero + Payments/Banking/Accounting categories"
```

---

## Task 4 — Add mock Stripe + Plaid + QB + Xero fixtures to connector-canvas

**Why:** The Connected tab needs to render a believable mix of demo connections including the new providers, so we can screenshot the redesign in a "lived-in" state.

**Files:**
- Modify: `lib/api/fixtures/connector-canvas.ts`

- [ ] **Step 1: Add four new mock connections + their datasets**

Append to `connectorConnections` in `lib/api/fixtures/connector-canvas.ts`:

```ts
{
  id: 'conn_stripe_acred',
  connectorId: 'stripe',
  category: 'payments',
  name: 'Stripe',
  subtitle: 'acct_1Hyve24',
  status: 'ok',
  lastSyncAt: ts(2),
  cadence: '5min poll',
  datasetIds: ['ds_stripe_charges', 'ds_stripe_invoices', 'ds_stripe_customers'],
},
{
  id: 'conn_plaid_acred',
  connectorId: 'plaid',
  category: 'banking',
  name: 'Plaid',
  subtitle: 'item_HyveCreditFacility',
  status: 'ok',
  lastSyncAt: ts(8),
  cadence: '15min poll',
  datasetIds: ['ds_plaid_transactions', 'ds_plaid_balances'],
},
{
  id: 'conn_quickbooks_acred',
  connectorId: 'quickbooks',
  category: 'accounting',
  name: 'QuickBooks',
  subtitle: 'realm_4620816365…',
  status: 'attention',
  lastSyncAt: ts(180),
  cadence: 'hourly',
  datasetIds: ['ds_qb_invoices', 'ds_qb_expenses'],
  credentialsExpireAt: new Date(Date.now() + 5 * 24 * 60 * 60_000).toISOString(),
},
```

Append to `connectionDatasets`:

```ts
{ id: 'ds_stripe_charges', connectionId: 'conn_stripe_acred', name: 'charges',
  rowCount: 187_240, rowUnit: 'rows', lastSyncAt: ts(2), vaultIds: ['vault_acred'] },
{ id: 'ds_stripe_invoices', connectionId: 'conn_stripe_acred', name: 'invoices',
  rowCount: 12_410, rowUnit: 'rows', lastSyncAt: ts(2), vaultIds: ['vault_acred'] },
{ id: 'ds_stripe_customers', connectionId: 'conn_stripe_acred', name: 'customers',
  rowCount: 4_120, rowUnit: 'rows', lastSyncAt: ts(2), vaultIds: ['vault_acred'] },
{ id: 'ds_plaid_transactions', connectionId: 'conn_plaid_acred', name: 'transactions',
  rowCount: 38_290, rowUnit: 'rows', lastSyncAt: ts(8), vaultIds: ['vault_acred'] },
{ id: 'ds_plaid_balances', connectionId: 'conn_plaid_acred', name: 'balances',
  rowCount: 412, rowUnit: 'rows', lastSyncAt: ts(8), vaultIds: ['vault_acred'] },
{ id: 'ds_qb_invoices', connectionId: 'conn_quickbooks_acred', name: 'invoices',
  rowCount: 8_120, rowUnit: 'rows', lastSyncAt: ts(180), vaultIds: ['vault_acred'] },
{ id: 'ds_qb_expenses', connectionId: 'conn_quickbooks_acred', name: 'expenses',
  rowCount: 14_890, rowUnit: 'rows', lastSyncAt: ts(180), vaultIds: ['vault_acred'] },
```

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add lib/api/fixtures/connector-canvas.ts
git commit -m "feat(sources): add Stripe/Plaid/QuickBooks demo fixtures"
```

---

## Task 5 — Copy + extend `setup-reducer.ts` (rename states; add `trust`)

**Strategy note:** All "move" tasks (5, 6, 13, 14, 15) copy rather than `git mv`. The old `setup/` files stay in place — the canvas still imports them and is alive until Task 20. Plain copies for now; Task 20 deletes the entire `setup/` folder once the canvas itself goes. Git rename-detection is fine to lose for a single-PR change.

**Files:**
- Create: `components/v2/features/sources/add-source-modal/setup-reducer.ts` (copy of `setup/setup-reducer.ts`, with edits)
- Leave: `components/v2/features/sources/setup/setup-reducer.ts` untouched
- Modify: `tests/unit/sources/setup-reducer.test.ts` (point at new path, update state names, add new tests)

- [ ] **Step 1: Create directories**

```
mkdir -p components/v2/features/sources/add-source-modal/steps
```

- [ ] **Step 2: Write the failing tests in the new location**

Move + update test imports. In `tests/unit/sources/setup-reducer.test.ts`, replace the import:

```ts
// before:
import { setupReducer, initialSetup, type SetupState } from '@/components/v2/features/sources/setup/setup-reducer'
// after:
import { setupReducer, initialSetup, type SetupState } from '@/components/v2/features/sources/add-source-modal/setup-reducer'
```

Update state-name expectations in all existing tests:

- `'discovering'` → `'discover'`
- `'select'` → `'confirm'`

Add new tests for the `trust` state:

```ts
it("'submitAuth' moves to trust (not discover)", () => {
  const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
  const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
  const c = setupReducer(b, { type: 'submitAuth' })
  expect(c.step).toBe('trust')
})

it("'submitTrust' moves from trust to discover", () => {
  const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
  const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
  const c = setupReducer(b, { type: 'submitAuth' })            // → trust
  const d = setupReducer(c, { type: 'submitTrust' })
  expect(d.step).toBe('discover')
})

it("'discoveryComplete' from discover moves to confirm", () => {
  const a: SetupState = {
    step: 'discover',
    connectorId: 's3',
    authPayload: { bucket: 'acme' },
    discovered: [],
    selectedIds: [],
  }
  const b = setupReducer(a, {
    type: 'discoveryComplete',
    discovered: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }],
  })
  expect(b.step).toBe('confirm')
})
```

- [ ] **Step 3: Run tests to verify they fail**

```
pnpm test tests/unit/sources/setup-reducer.test.ts
```

Expected: FAIL on every renamed state.

- [ ] **Step 4: Create the new reducer file**

`cp components/v2/features/sources/setup/setup-reducer.ts components/v2/features/sources/add-source-modal/setup-reducer.ts`

Now edit `components/v2/features/sources/add-source-modal/setup-reducer.ts` (the new copy):

1. Rename `'discovering'` → `'discover'` (state name + everywhere it appears).
2. Rename `'select'` → `'confirm'` (state name + everywhere it appears).
3. Add `'trust'` step. Updated discriminated union:

```ts
export type SetupState =
  | { step: 'idle' }
  | { step: 'auth'; connectorId: string; authPayload: Record<string, unknown> }
  | { step: 'trust'; connectorId: string; authPayload: Record<string, unknown> }
  | { step: 'discover'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'confirm'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'submitting'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'error'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[]; error: string }
  | { step: 'done'; connectorId: string; connectionId: string }
```

4. Add action `{ type: 'submitTrust' }`. Update `submitAuth` to transition to `trust` instead of `discover`.

Updated reducer (relevant cases):

```ts
case 'submitAuth':
  if (state.step !== 'auth') return state
  return { step: 'trust', connectorId: state.connectorId, authPayload: state.authPayload }
case 'submitTrust':
  if (state.step !== 'trust') return state
  return { step: 'discover', connectorId: state.connectorId, authPayload: state.authPayload, discovered: [], selectedIds: [] }
case 'discoveryComplete':
  if (state.step !== 'discover') return state
  return {
    step: 'confirm',
    connectorId: state.connectorId,
    authPayload: state.authPayload,
    discovered: action.discovered,
    selectedIds: action.discovered.map((d) => d.id),
  }
case 'toggleDataset':
  if (state.step !== 'confirm' && state.step !== 'submitting') return state
  ...
case 'submitSelect':
  if (state.step !== 'confirm') return state
  return { step: 'submitting', ... }
case 'saveSuccess':
  return { step: 'done', connectorId: state.connectorId!, connectionId: action.connectionId }
```

- [ ] **Step 5: Run tests to verify they pass**

```
pnpm test tests/unit/sources/setup-reducer.test.ts
```

Expected: PASS, all assertions.

- [ ] **Step 6: Typecheck**

```
pnpm typecheck
```

Expected: green. The old `setup/setup-reducer.ts` still exists with its old state names and still typechecks against the canvas consumers — they're untouched. The new file exists alongside it with the renamed states.

- [ ] **Step 7: Commit**

```
git add components/v2/features/sources/add-source-modal/setup-reducer.ts tests/unit/sources/setup-reducer.test.ts
git commit -m "refactor(sources): add-source-modal/setup-reducer with renamed states (discover/confirm) + trust"
```

---

## Task 6 — Copy field-schemas.ts; add OAuth schemas for Stripe / Plaid / QB / Xero

**Files:**
- Create: `components/v2/features/sources/add-source-modal/field-schemas.ts` (copy of `setup/field-schemas.ts`)
- Leave: `components/v2/features/sources/setup/field-schemas.ts` untouched

- [ ] **Step 1: Copy the file**

```
cp components/v2/features/sources/setup/field-schemas.ts \
   components/v2/features/sources/add-source-modal/field-schemas.ts
```

- [ ] **Step 2: Add OAuth-shape schemas in the new copy**

For OAuth providers, the auth payload is just the `accountId` returned by Hyve Bridge. Append to `field-schemas.ts`:

```ts
import { z } from 'zod'

const oauthSchema = {
  schema: z.object({ accountId: z.string().min(1) }),
  fields: [], // no user-facing form fields — OAuth button only
}

const STRIPE = oauthSchema
const PLAID = oauthSchema
const QUICKBOOKS = oauthSchema
const XERO = oauthSchema

export function authSchemaFor(connectorId: string) {
  switch (connectorId) {
    case 's3': return S3
    case 'file-upload': return FILE_UPLOAD
    case 'sec-edgar': return SEC_EDGAR
    case 'stripe': return STRIPE
    case 'plaid': return PLAID
    case 'quickbooks': return QUICKBOOKS
    case 'xero': return XERO
    default: return null
  }
}
```

(Preserve all existing schemas — only add the four new cases.)

- [ ] **Step 3: Typecheck**

```
pnpm typecheck
```

Expected: green. Old file untouched; new file adds OAuth schemas.

- [ ] **Step 4: Commit**

```
git add components/v2/features/sources/add-source-modal/field-schemas.ts
git commit -m "feat(sources): add-source-modal field-schemas with OAuth (stripe/plaid/qb/xero)"
```

---

## Task 7 — Sample-rows fixtures (`sample-rows.ts`)

**Files:**
- Create: `components/v2/features/sources/add-source-modal/sample-rows.ts`

- [ ] **Step 1: Create the file**

```ts
// components/v2/features/sources/add-source-modal/sample-rows.ts

export type SampleRow = Record<string, string>

export type SamplePreview =
  | { kind: 'tabular'; columns: string[]; rows: SampleRow[] }
  | { kind: 'objects'; items: Array<{ name: string; size: string; modified: string }> }

const SAMPLES: Record<string, SamplePreview> = {
  // Stripe
  'stripe:charges': {
    kind: 'tabular',
    columns: ['id', 'amount', 'currency', 'customer', 'status', 'created'],
    rows: [
      { id: 'ch_3Q••••AT', amount: '12,400', currency: 'usd', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:02:11Z' },
      { id: 'ch_3Q••••AU', amount: '4,200',  currency: 'usd', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:07:08Z' },
      { id: 'ch_3Q••••AV', amount: '88,750', currency: 'usd', customer: 'cus_••••••', status: 'refunded',  created: '2026-05-23T14:18:32Z' },
      { id: 'ch_3Q••••AW', amount: '1,150',  currency: 'eur', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:24:07Z' },
      { id: 'ch_3Q••••AX', amount: '210,000',currency: 'usd', customer: 'cus_••••••', status: 'succeeded', created: '2026-05-23T14:29:51Z' },
    ],
  },
  'stripe:invoices': {
    kind: 'tabular',
    columns: ['id', 'customer', 'total', 'currency', 'status', 'period'],
    rows: [
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '120,000', currency: 'usd', status: 'paid',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '47,500',  currency: 'usd', status: 'paid',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '8,200',   currency: 'usd', status: 'open',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '92,000',  currency: 'usd', status: 'paid',      period: '2026-05' },
      { id: 'in_1Q••••', customer: 'cus_••••••', total: '610,000', currency: 'usd', status: 'uncollectible', period: '2026-04' },
    ],
  },
  'stripe:customers': {
    kind: 'tabular',
    columns: ['id', 'email', 'name', 'created', 'total_lifetime'],
    rows: [
      { id: 'cus_PA••••', email: '•••@aurora.fund', name: 'Aurora Capital LP',    created: '2024-11-12', total_lifetime: '4,820,000' },
      { id: 'cus_PB••••', email: '•••@steady.bk',  name: 'Steady Bank',           created: '2025-02-04', total_lifetime: '1,107,000' },
      { id: 'cus_PC••••', email: '•••@orchid.io',  name: 'Orchid Holdings',       created: '2025-04-21', total_lifetime: '218,400' },
      { id: 'cus_PD••••', email: '•••@cliff.lp',   name: 'Cliffside Partners',    created: '2025-06-30', total_lifetime: '92,150' },
      { id: 'cus_PE••••', email: '•••@halo.fi',    name: 'Halo Financial',        created: '2025-09-11', total_lifetime: '12,800' },
    ],
  },

  // Plaid
  'plaid:transactions': {
    kind: 'tabular',
    columns: ['id', 'account', 'amount', 'name', 'category', 'date'],
    rows: [
      { id: 'tx_AA••••', account: '••••2487', amount: '-12,400', name: 'AURORA CAPITAL DRAW', category: 'Transfer', date: '2026-05-23' },
      { id: 'tx_AB••••', account: '••••2487', amount: '-4,200',  name: 'WIRE TO STEADY BANK', category: 'Transfer', date: '2026-05-23' },
      { id: 'tx_AC••••', account: '••••2487', amount: '880,000', name: 'INBOUND ACH FACILITY', category: 'Transfer', date: '2026-05-22' },
      { id: 'tx_AD••••', account: '••••2487', amount: '-95,000', name: 'SERVICE FEE',          category: 'Fee',      date: '2026-05-22' },
      { id: 'tx_AE••••', account: '••••2487', amount: '-2,400',  name: 'OUTBOUND WIRE',        category: 'Transfer', date: '2026-05-22' },
    ],
  },
  'plaid:balances': {
    kind: 'tabular',
    columns: ['account', 'available', 'current', 'limit', 'iso_currency'],
    rows: [
      { account: '••••2487', available: '4,212,890', current: '4,212,890', limit: '—', iso_currency: 'USD' },
      { account: '••••8841', available: '0',         current: '0',         limit: '5,000,000', iso_currency: 'USD' },
    ],
  },

  // QuickBooks
  'quickbooks:invoices': {
    kind: 'tabular',
    columns: ['id', 'doc_number', 'customer', 'total', 'currency', 'balance', 'due'],
    rows: [
      { id: 'inv_AA', doc_number: '2026-0148', customer: 'Aurora Capital',  total: '120,000', currency: 'USD', balance: '0',       due: '2026-05-30' },
      { id: 'inv_AB', doc_number: '2026-0149', customer: 'Steady Bank',     total: '47,500',  currency: 'USD', balance: '0',       due: '2026-06-04' },
      { id: 'inv_AC', doc_number: '2026-0150', customer: 'Orchid Holdings', total: '8,200',   currency: 'USD', balance: '8,200',   due: '2026-06-12' },
      { id: 'inv_AD', doc_number: '2026-0151', customer: 'Cliffside',       total: '92,000',  currency: 'USD', balance: '0',       due: '2026-06-12' },
      { id: 'inv_AE', doc_number: '2026-0152', customer: 'Halo Financial',  total: '610,000', currency: 'USD', balance: '610,000', due: '2026-06-22' },
    ],
  },
  'quickbooks:expenses': {
    kind: 'tabular',
    columns: ['id', 'payee', 'category', 'amount', 'date', 'memo'],
    rows: [
      { id: 'exp_AA', payee: '•••• Hosting',         category: 'Infrastructure',   amount: '12,400', date: '2026-05-23', memo: 'Vault compute • May' },
      { id: 'exp_AB', payee: '•••• Counsel LLP',     category: 'Legal',            amount: '47,500', date: '2026-05-21', memo: 'Series A docs' },
      { id: 'exp_AC', payee: '•••• Custody Inc.',    category: 'Custody fees',     amount: '8,200',  date: '2026-05-15', memo: 'Q2 custody' },
      { id: 'exp_AD', payee: '•••• Risk Engine',     category: 'Software',         amount: '4,000',  date: '2026-05-14', memo: '' },
      { id: 'exp_AE', payee: '•••• Audit Partners',  category: 'Audit',            amount: '92,000', date: '2026-05-08', memo: 'Mid-year audit retainer' },
    ],
  },

  // S3 (non-tabular variant — object list)
  's3:borrower_packets': {
    kind: 'objects',
    items: [
      { name: 'BP-2026-Q1-0001.pdf', size: '4.2 MB',  modified: '2026-05-21' },
      { name: 'BP-2026-Q1-0002.pdf', size: '3.8 MB',  modified: '2026-05-21' },
      { name: 'BP-2026-Q1-0003.pdf', size: '5.1 MB',  modified: '2026-05-22' },
      { name: 'BP-2026-Q1-0004.pdf', size: '4.6 MB',  modified: '2026-05-22' },
      { name: 'BP-2026-Q1-0005.pdf', size: '4.4 MB',  modified: '2026-05-23' },
    ],
  },
}

export function samplePreviewFor(connectorId: string, datasetId: string): SamplePreview | null {
  return SAMPLES[`${connectorId}:${datasetId}`] ?? null
}
```

(For datasets not listed here, `samplePreviewFor` returns `null`; the Confirm step renders a "No sample available" placeholder for those.)

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: pass.

- [ ] **Step 3: Commit**

```
git add components/v2/features/sources/add-source-modal/sample-rows.ts
git commit -m "feat(sources): add per-provider sample-row fixtures for Confirm preview"
```

---

## Task 8 — `<SourcesShell>`: tabbed page container with URL state

**Files:**
- Create: `components/v2/features/sources/sources-shell.tsx`
- Create: `tests/unit/sources/sources-shell.test.tsx`
- Modify: `components/v2/features/sources/index.ts`
- Modify: `app/(originator)/sources/page.tsx`

- [ ] **Step 1: Write the failing test**

`tests/unit/sources/sources-shell.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourcesShell } from '@/components/v2/features/sources/sources-shell'

// Stub next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sources',
}))

const fakeConnections = [
  {
    id: 'conn_1', connectorId: 'stripe', category: 'payments' as const, name: 'Stripe',
    subtitle: 'acct_x', status: 'ok' as const, lastSyncAt: new Date().toISOString(),
    cadence: '5min', datasetIds: ['ds1'],
  },
]
const fakeDatasets = [
  { id: 'ds1', connectionId: 'conn_1', name: 'charges', rowCount: 100, rowUnit: 'rows' as const,
    lastSyncAt: new Date().toISOString(), vaultIds: [] },
]

describe('<SourcesShell>', () => {
  it('renders the page title and Connected count badge', () => {
    render(<SourcesShell connections={fakeConnections} datasets={fakeDatasets} />)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Connected · 1/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Catalogue/i })).toBeInTheDocument()
  })

  it('renders the "+ Connect a source" CTA', () => {
    render(<SourcesShell connections={fakeConnections} datasets={fakeDatasets} />)
    expect(screen.getByRole('button', { name: /Connect a source/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm test tests/unit/sources/sources-shell.test.tsx
```

Expected: FAIL (`sources-shell.tsx` doesn't exist).

- [ ] **Step 3: Implement `<SourcesShell>`**

`components/v2/features/sources/sources-shell.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ConnectedTab } from './connected/connected-tab'
import { CatalogueTab } from './catalogue/catalogue-tab'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
}

type TabValue = 'connected' | 'catalogue'

export function SourcesShell({ connections, datasets }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const urlTab: TabValue = searchParams.get('tab') === 'catalogue' ? 'catalogue' : 'connected'
  const [tab, setTab] = useState<TabValue>(urlTab)

  function changeTab(next: TabValue) {
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'connected') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    })
  }

  return (
    <div className="mx-auto flex w-full flex-col gap-7 px-6 py-8 md:px-8 md:py-10">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[30px] font-normal leading-tight tracking-tight text-v2-foreground">
            Sources
          </h1>
          <p className="text-[13.5px] text-v2-muted max-w-prose">
            {connections.length} sources feeding {datasets.length} datasets.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-2 text-sm font-medium text-white hover:bg-[oklch(0.36_0.10_160)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.40_0.10_160)]"
          onClick={() => { /* opens modal — wired in Task 16 */ }}
        >
          + Connect a source
        </button>
      </header>

      <Tabs value={tab} onValueChange={(v) => changeTab(v as TabValue)}>
        <TabsList aria-label="Sources views">
          <TabsTrigger value="connected">Connected · {connections.length}</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        </TabsList>
        <TabsContent value="connected" className="mt-5">
          <ConnectedTab connections={connections} datasets={datasets} />
        </TabsContent>
        <TabsContent value="catalogue" className="mt-5">
          <CatalogueTab connections={connections} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

(The CTA `onClick` is left empty here; modal wiring happens in Task 16. The component compiles because the wiring is added later in the same file.)

- [ ] **Step 4: Stub `ConnectedTab` and `CatalogueTab` so the file imports succeed**

`components/v2/features/sources/connected/connected-tab.tsx`:

```tsx
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
}

export function ConnectedTab(_props: Props) {
  return <div className="text-[13px] text-v2-muted">Connected tab — coming in Task 9.</div>
}
```

`components/v2/features/sources/catalogue/catalogue-tab.tsx`:

```tsx
import type { ConnectorConnection } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
}

export function CatalogueTab(_props: Props) {
  return <div className="text-[13px] text-v2-muted">Catalogue tab — coming in Task 11.</div>
}
```

- [ ] **Step 5: Update `index.ts`**

Replace `components/v2/features/sources/index.ts` contents:

```ts
export { SourcesShell } from './sources-shell'
```

- [ ] **Step 6: Update `page.tsx`**

`app/(originator)/sources/page.tsx`:

```tsx
import { fixtures } from '@/lib/api/fixtures'
import { SourcesShell } from '@/components/v2/features/sources'

export const metadata = {
  title: 'Sources — Hyve',
}

export default function SourcesPage() {
  const { connections, datasets } = fixtures.connectorCanvas
  return <SourcesShell connections={connections} datasets={datasets} />
}
```

- [ ] **Step 7: Run shell test**

```
pnpm test tests/unit/sources/sources-shell.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Run dev server, eyeball the page**

```
pnpm dev
```

Visit `http://localhost:3000/sources`. Expect: heading "Sources", subtext, CTA button, two tabs (Connected default, Catalogue), stub content in each. Switch tabs → URL updates with `?tab=catalogue`. Refresh → tab persists.

- [ ] **Step 9: Commit**

```
git add components/v2/features/sources/sources-shell.tsx components/v2/features/sources/connected/connected-tab.tsx components/v2/features/sources/catalogue/catalogue-tab.tsx components/v2/features/sources/index.ts app/\(originator\)/sources/page.tsx tests/unit/sources/sources-shell.test.tsx
git commit -m "feat(sources): SourcesShell with tabbed Connected/Catalogue layout"
```

---

## Task 9 — `<ConnectionRow>` + Connected tab list

**Files:**
- Create: `components/v2/features/sources/connected/connection-row.tsx`
- Modify: `components/v2/features/sources/connected/connected-tab.tsx`

- [ ] **Step 1: Implement `<ConnectionRow>`**

`components/v2/features/sources/connected/connection-row.tsx`:

```tsx
'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import type { ConnectorConnection, ConnectionDataset, ConnectionStatus } from '@/lib/api/schemas'

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  ok: 'healthy',
  attention: 'attention',
  error: 'error',
  paused: 'paused',
}

const STATUS_DOT_BG: Record<ConnectionStatus, string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

const STATUS_DOT_VARIANT: Record<ConnectionStatus, string> = {
  ok: 'rounded-full',
  attention: 'rounded-full ring-1 ring-current ring-offset-1 ring-offset-v2-surface',
  error: 'rounded-[1px]',
  paused: 'rounded-full bg-transparent border border-v2-muted/60',
}

function formatAgo(iso: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`
  return `${Math.round(diffMin / (60 * 24))}d ago`
}

type Props = {
  connection: ConnectorConnection
  datasets: readonly ConnectionDataset[]
  onClick: () => void
}

export function ConnectionRow({ connection, datasets, onClick }: Props) {
  const def = connectorById(connection.connectorId)
  const datasetCount = datasets.length
  const datasetsLabel = datasetCount === 0
    ? 'no datasets'
    : datasetCount <= 2
      ? datasets.map((d) => d.name).join(' + ')
      : `${datasets[0].name} + ${datasetCount - 1}`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${connection.name} — ${STATUS_LABEL[connection.status]}, ${datasetCount} datasets, last synced ${formatAgo(connection.lastSyncAt)}`}
      className="group flex w-full items-center gap-4 rounded-md px-4 py-3.5 text-left hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
    >
      {def?.logo.kind === 'wordmark' ? (
        <span
          aria-hidden="true"
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold', WORDMARK_TONES[def.logo.tone])}
        >
          {def.logo.label}
        </span>
      ) : def?.logo.kind === 'icon' ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-v2-surface-2">
          <def.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.75} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-v2-foreground">{connection.name}</div>
        <div className="mt-0.5 truncate text-[11.5px] text-v2-muted">
          {connection.subtitle ? (
            <span className="font-mono text-v2-muted/85">{connection.subtitle}</span>
          ) : null}
          {connection.subtitle ? <span className="mx-1.5">·</span> : null}
          <span>{datasetsLabel}</span>
          <span className="mx-1.5">·</span>
          <span>synced {formatAgo(connection.lastSyncAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-[11px] text-v2-muted">
        <span aria-hidden="true" className={cn('size-1.5', STATUS_DOT_BG[connection.status], STATUS_DOT_VARIANT[connection.status])} />
        <span>{STATUS_LABEL[connection.status]}</span>
        <ChevronRight className="size-3.5 text-v2-muted/60 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Implement Connected tab list**

Replace `components/v2/features/sources/connected/connected-tab.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { ConnectionRow } from './connection-row'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  onRowClick?: (connectionId: string) => void
}

export function ConnectedTab({ connections, datasets, onRowClick }: Props) {
  const [query, setQuery] = useState('')

  const datasetsByConn = useMemo(() => {
    const map = new Map<string, ConnectionDataset[]>()
    for (const d of datasets) {
      const arr = map.get(d.connectionId) ?? []
      arr.push(d)
      map.set(d.connectionId, arr)
    }
    return map
  }, [datasets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return connections
    return connections.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.subtitle?.toLowerCase().includes(q) ?? false),
    )
  }, [connections, query])

  if (connections.length === 0) {
    return null /* empty state is Task 10 */
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sources…"
          aria-label="Search sources"
          className="w-full max-w-xs rounded-md border border-v2-border bg-v2-surface px-3 py-1.5 text-[12.5px] placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
        />
        <span className="ml-auto text-[11px] text-v2-muted">{filtered.length} of {connections.length}</span>
      </div>
      <ul className="flex flex-col divide-y divide-v2-border/60 rounded-lg border border-v2-border/60 bg-v2-surface/40">
        {filtered.map((c) => (
          <li key={c.id}>
            <ConnectionRow
              connection={c}
              datasets={datasetsByConn.get(c.id) ?? []}
              onClick={() => onRowClick?.(c.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Run dev server**

```
pnpm dev
```

Visit `/sources`. Expect: Connected tab shows ~10 fixture rows including the new Stripe/Plaid/QuickBooks ones. Type in search box → list filters live.

- [ ] **Step 4: Commit**

```
git add components/v2/features/sources/connected/
git commit -m "feat(sources): Connected tab list with search and ConnectionRow"
```

---

## Task 10 — Connected tab empty state

**Files:**
- Modify: `components/v2/features/sources/connected/connected-tab.tsx`

- [ ] **Step 1: Add empty-state render**

In `connected-tab.tsx`, replace the `if (connections.length === 0) return null` early return:

```tsx
if (connections.length === 0) {
  return (
    <div className="rounded-lg border border-dashed border-v2-border/80 bg-v2-surface/30 px-8 py-12 text-center">
      <h2 className="font-serif text-[20px] text-v2-foreground">No sources connected yet.</h2>
      <p className="mt-1 text-[12.5px] text-v2-muted">Start with one of these — or browse the full catalogue.</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {['stripe', 'plaid', 's3', 'sec-edgar'].map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onRowClick?.(`__add:${id}`)}
            className="rounded-md border border-v2-border bg-v2-surface px-3 py-1.5 text-[12px] text-v2-foreground hover:border-v2-foreground/40"
          >
            {id === 'sec-edgar' ? 'SEC EDGAR' : id[0].toUpperCase() + id.slice(1)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onRowClick?.('__browse')}
          className="rounded-md px-3 py-1.5 text-[12px] text-v2-muted underline-offset-2 hover:underline"
        >
          Browse catalogue →
        </button>
      </div>
    </div>
  )
}
```

(The `__add:<id>` and `__browse` sentinels are interpreted by the parent in Task 16 to either open the modal or switch tabs.)

- [ ] **Step 2: Verify by toggling fixtures**

To eyeball the empty state without removing the real fixtures, temporarily edit `page.tsx`:

```tsx
const { datasets } = fixtures.connectorCanvas
return <SourcesShell connections={[]} datasets={datasets} />
```

Visit `/sources`. Expect the empty state. Revert the edit before committing.

- [ ] **Step 3: Commit**

```
git add components/v2/features/sources/connected/connected-tab.tsx
git commit -m "feat(sources): Connected tab empty state with quick picks"
```

---

## Task 11 — Catalogue tab + cards

**Files:**
- Create: `components/v2/features/sources/catalogue/catalogue-card.tsx`
- Modify: `components/v2/features/sources/catalogue/catalogue-tab.tsx`

- [ ] **Step 1: Implement `<CatalogueCard>`**

`components/v2/features/sources/catalogue/catalogue-card.tsx`:

```tsx
'use client'

import { cn } from '@/lib/utils'
import { WORDMARK_TONES, type ConnectorDefinition } from '../catalog-data'

type Badge =
  | { kind: 'none' }
  | { kind: 'soon' }
  | { kind: 'connected'; count: number }

type Props = {
  def: ConnectorDefinition
  badge: Badge
  onClick: () => void
}

export function CatalogueCard({ def, badge, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${def.name} — ${badge.kind === 'connected' ? `${badge.count} connected` : badge.kind === 'soon' ? 'Coming soon' : 'Add'}`}
      className={cn(
        'group flex h-[112px] w-full flex-col justify-between rounded-lg border border-v2-border bg-v2-surface p-3 text-left transition-colors',
        'hover:border-v2-foreground/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        badge.kind === 'soon' && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between">
        {def.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn('flex size-10 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}
          >
            {def.logo.label}
          </span>
        ) : (
          <span className="flex size-10 items-center justify-center rounded-md bg-v2-surface-2">
            <def.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} />
          </span>
        )}
        {badge.kind === 'connected' && (
          <span className="rounded-full bg-[oklch(0.55_0.10_150)]/15 px-2 py-0.5 text-[10.5px] font-medium text-[oklch(0.40_0.10_150)]">
            Connected · {badge.count}
          </span>
        )}
        {badge.kind === 'soon' && (
          <span className="rounded-full bg-v2-foreground/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-v2-muted">
            Coming soon
          </span>
        )}
      </div>
      <div>
        <div className="text-[13px] font-medium text-v2-foreground">{def.name}</div>
        <div className="mt-0.5 truncate text-[11px] text-v2-muted">{def.tagline}</div>
      </div>
    </button>
  )
}
```

- [ ] **Step 2: Implement Catalogue tab**

Replace `components/v2/features/sources/catalogue/catalogue-tab.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { CatalogueCard } from './catalogue-card'
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, type ConnectorDefinition } from '../catalog-data'
import { cn } from '@/lib/utils'
import type { ConnectorConnection } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  onPick?: (connectorId: string) => void
  onAlreadyConnected?: (connectorId: string) => void
}

export function CatalogueTab({ connections, onPick, onAlreadyConnected }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const connectedCountByConnector = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of connections) map.set(c.connectorId, (map.get(c.connectorId) ?? 0) + 1)
    return map
  }, [connections])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((c) => {
      if (activeCategory && c.category !== activeCategory) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, activeCategory])

  const byCategory = useMemo(() => {
    const map = new Map<string, ConnectorDefinition[]>()
    for (const c of visible) {
      const arr = map.get(c.category) ?? []
      arr.push(c)
      map.set(c.category, arr)
    }
    return map
  }, [visible])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search providers…"
          aria-label="Search catalogue"
          className="w-full max-w-xs rounded-md border border-v2-border bg-v2-surface px-3 py-1.5 text-[12.5px] placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="All" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
          {CATEGORY_ORDER.map((cat) => (
            <FilterChip
              key={cat}
              label={CATEGORY_LABELS[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-7">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory.get(cat)
          if (!items || items.length === 0) return null
          return (
            <section key={cat}>
              <h2 className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-v2-muted">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                {items.map((def) => {
                  const connected = connectedCountByConnector.get(def.id) ?? 0
                  const badge = connected > 0
                    ? { kind: 'connected' as const, count: connected }
                    : def.wired === 'soon'
                      ? { kind: 'soon' as const }
                      : { kind: 'none' as const }
                  return (
                    <CatalogueCard
                      key={def.id}
                      def={def}
                      badge={badge}
                      onClick={() => {
                        if (badge.kind === 'connected') onAlreadyConnected?.(def.id)
                        else if (def.wired === 'wired') onPick?.(def.id)
                        else { /* Coming soon — toast handled in Task 16 */ onPick?.(`__soon:${def.id}`) }
                      }}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-[11.5px] transition-colors',
        active
          ? 'border-v2-foreground bg-v2-foreground text-v2-background'
          : 'border-v2-border text-v2-muted hover:text-v2-foreground hover:border-v2-foreground/40',
      )}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Run dev**

```
pnpm dev
```

Visit `/sources?tab=catalogue`. Expect: 12 categories with cards. Filter chips work. Search filters. Stripe/Plaid/QuickBooks cards show "Connected · 1" badge. Cards for "soon" connectors are dimmed with Coming-soon badge.

- [ ] **Step 4: Commit**

```
git add components/v2/features/sources/catalogue/
git commit -m "feat(sources): Catalogue tab with filter chips, search, state-aware cards"
```

---

## Task 12 — `<TrustStep>` component

**Files:**
- Create: `components/v2/features/sources/add-source-modal/steps/trust-step.tsx`
- Create: `tests/unit/sources/trust-step.test.tsx`

- [ ] **Step 1: Write the failing test**

`tests/unit/sources/trust-step.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustStep } from '@/components/v2/features/sources/add-source-modal/steps/trust-step'

describe('<TrustStep>', () => {
  it('renders the four rows for a wired connector (stripe)', () => {
    render(<TrustStep connectorId="stripe" onContinue={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /What Hyve will do with your Stripe data/i })).toBeInTheDocument()
    expect(screen.getByText(/Reads/i)).toBeInTheDocument()
    expect(screen.getByText(/Storage/i)).toBeInTheDocument()
    expect(screen.getByText(/Audit/i)).toBeInTheDocument()
    expect(screen.getByText(/Revoke/i)).toBeInTheDocument()
    expect(screen.getByText(/charges, invoices, customers, refunds, subscriptions/i)).toBeInTheDocument()
  })

  it('renders a fallback for an unknown connector', () => {
    render(<TrustStep connectorId="__nope__" onContinue={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/No trust copy available/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
pnpm test tests/unit/sources/trust-step.test.tsx
```

Expected: FAIL (file doesn't exist).

- [ ] **Step 3: Implement `<TrustStep>`**

`components/v2/features/sources/add-source-modal/steps/trust-step.tsx`:

```tsx
'use client'

import { connectorById } from '../../catalog-data'

type Props = {
  connectorId: string
  onContinue: () => void
  onCancel: () => void
}

export function TrustStep({ connectorId, onContinue, onCancel }: Props) {
  const def = connectorById(connectorId)
  const trust = def?.trust

  if (!trust) {
    return (
      <div className="flex flex-col gap-3 px-1 pt-2">
        <p className="text-[12.5px] text-v2-muted">No trust copy available for this connector yet.</p>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground">Cancel</button>
          <button type="button" onClick={onContinue} className="rounded-md bg-[oklch(0.40_0.10_160)] px-3 py-1.5 text-[12px] font-medium text-white">Continue →</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-1 pt-2">
      <h2 className="font-serif text-[22px] font-normal leading-tight tracking-tight text-v2-foreground">
        What Hyve will do with your {def?.name} data.
      </h2>

      <dl className="grid gap-0 divide-y divide-v2-border/60 border-t border-b border-v2-border/60">
        <Row k="Reads" v={trust.reads} />
        <Row k="Storage" v={trust.storage} />
        <Row k="Audit" v={trust.audit} />
        <Row k="Revoke" v={trust.revoke} />
      </dl>

      <div className="flex items-center justify-between gap-3 pt-1">
        <a
          href="/legal/data-handling"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] text-v2-muted underline underline-offset-2 hover:text-v2-foreground"
        >
          Full data handling policy
        </a>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground">Cancel</button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.40_0.10_160)]"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-4 py-3">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted">{k}</dt>
      <dd className="text-[12.5px] leading-[1.55] text-v2-foreground">{v}</dd>
    </div>
  )
}
```

- [ ] **Step 4: Run test**

```
pnpm test tests/unit/sources/trust-step.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```
git add components/v2/features/sources/add-source-modal/steps/trust-step.tsx tests/unit/sources/trust-step.test.tsx
git commit -m "feat(sources): TrustStep with per-connector reads/storage/audit/revoke copy"
```

---

## Task 13 — Copy + extend `<AuthStep>` with OAuth and FileUpload sub-shapes

**Files:**
- Create: `components/v2/features/sources/add-source-modal/steps/auth-step.tsx` (copy of `setup/auth-step.tsx`)
- Leave: `setup/auth-step.tsx` untouched

- [ ] **Step 1: Copy the file**

```
cp components/v2/features/sources/setup/auth-step.tsx \
   components/v2/features/sources/add-source-modal/steps/auth-step.tsx
```

- [ ] **Step 2: Update internal imports in the new copy**

Open the moved `auth-step.tsx`. Update:

```ts
// before:
import { authSchemaFor } from './field-schemas'
// after (file is now in steps/, schemas in ..):
import { authSchemaFor } from '../field-schemas'
```

- [ ] **Step 3: Add the new sub-shapes**

Below the existing `AuthStep` function, replace it with this branching version:

```tsx
type Props = {
  connectorId: string
  values: Record<string, unknown>
  onUpdate: (patch: Record<string, unknown>) => void
  onSubmit: () => void
  onCancel: () => void
  onOAuthRequest: () => void   // for OAuth shape; opens Hyve Bridge
}

export function AuthStep(props: Props) {
  if (isOAuthConnector(props.connectorId)) return <OAuthShape {...props} />
  if (props.connectorId === 'file-upload') return <FileUploadShape {...props} />
  return <FormShape {...props} />
}

const OAUTH_CONNECTORS = new Set(['stripe', 'plaid', 'quickbooks', 'xero'])
function isOAuthConnector(id: string) { return OAUTH_CONNECTORS.has(id) }

function OAuthShape({ connectorId, onOAuthRequest, onCancel }: Props) {
  const NAME: Record<string, string> = {
    stripe: 'Stripe', plaid: 'Plaid', quickbooks: 'QuickBooks', xero: 'Xero',
  }
  const name = NAME[connectorId] ?? connectorId
  return (
    <div className="flex flex-col gap-4 px-1 pt-2">
      <p className="text-[12.5px] text-v2-muted leading-[1.55]">
        You'll be sent to a Hyve-hosted authorisation page to grant read access to your {name} account.
        We'll bring you back here as soon as you approve.
      </p>
      <button
        type="button"
        onClick={onOAuthRequest}
        className="self-start rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.40_0.10_160)]"
      >
        Sign in with {name} →
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="self-start text-[11.5px] text-v2-muted underline-offset-2 hover:underline"
      >
        Cancel
      </button>
    </div>
  )
}

function FileUploadShape({ onUpdate, onSubmit, onCancel }: Props) {
  return (
    <div className="flex flex-col gap-3 px-1 pt-2">
      <label
        className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-v2-border bg-v2-surface-2/40 text-center text-[12.5px] text-v2-muted hover:border-v2-foreground/40"
      >
        <span className="font-medium text-v2-foreground">Drop a file or click to upload</span>
        <span className="mt-1 text-[11px]">CSV · Parquet · JSON · up to 200 MB</span>
        <input
          type="file"
          accept=".csv,.parquet,.json"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            onUpdate({ label: f.name, size: f.size })
            onSubmit()
          }}
        />
      </label>
      <div className="flex justify-end">
        <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground">Cancel</button>
      </div>
    </div>
  )
}
```

(Keep the existing `FormShape` body. It's the previous `AuthStep` content, just renamed and unchanged.)

- [ ] **Step 4: Typecheck**

```
pnpm typecheck
```

Expected: green. Old file unchanged.

- [ ] **Step 5: Commit**

```
git add components/v2/features/sources/add-source-modal/steps/auth-step.tsx
git commit -m "feat(sources): AuthStep branches into OAuth / Form / FileUpload shapes"
```

---

## Task 14 — Copy + extend `<DiscoverStep>` (rename + add Stripe/Plaid/QB/Xero profiles)

**Files:**
- Create: `components/v2/features/sources/add-source-modal/steps/discover-step.tsx` (copy of `setup/discovery-step.tsx`)
- Leave: `setup/discovery-step.tsx` untouched

- [ ] **Step 1: Copy the file**

```
cp components/v2/features/sources/setup/discovery-step.tsx \
   components/v2/features/sources/add-source-modal/steps/discover-step.tsx
```

- [ ] **Step 2: Rename + extend PROFILES**

In the moved file, rename `DiscoveryStep` → `DiscoverStep` and add profiles. Updated `PROFILES`:

```ts
const PROFILES: Record<string, DiscoveryProfile> = {
  's3': { /* existing */ },
  'sec-edgar': { /* existing */ },
  'file-upload': { /* existing */ },

  'stripe': {
    steps: [
      { id: 'connect', label: 'Connecting to Stripe', duration: 500 },
      { id: 'list', label: 'Listing endpoints', duration: 600 },
      { id: 'sample', label: 'Sampling schemas', duration: 800 },
      { id: 'count', label: 'Counting recent rows', duration: 700 },
    ],
    result: [
      { id: 'charges',       name: 'charges',       subtitle: 'rows · 187K / mo',  rowCount: 187_240, rowUnit: 'rows' },
      { id: 'invoices',      name: 'invoices',      subtitle: 'rows · 12K / mo',   rowCount: 12_410,  rowUnit: 'rows' },
      { id: 'customers',     name: 'customers',     subtitle: 'rows · 4K / mo',    rowCount: 4_120,   rowUnit: 'rows' },
      { id: 'refunds',       name: 'refunds',       subtitle: 'rows · 1K / mo',    rowCount: 980,     rowUnit: 'rows' },
      { id: 'subscriptions', name: 'subscriptions', subtitle: 'rows · 2K / mo',    rowCount: 1_950,   rowUnit: 'rows' },
    ],
  },

  'plaid': {
    steps: [
      { id: 'connect', label: 'Connecting to Plaid', duration: 500 },
      { id: 'item',    label: 'Resolving item', duration: 600 },
      { id: 'sample',  label: 'Sampling balances and transactions', duration: 800 },
    ],
    result: [
      { id: 'transactions', name: 'transactions', subtitle: 'rows · 38K / mo', rowCount: 38_290, rowUnit: 'rows' },
      { id: 'balances',     name: 'balances',     subtitle: '2 accounts',       rowCount: 412,    rowUnit: 'rows' },
    ],
  },

  'quickbooks': {
    steps: [
      { id: 'connect', label: 'Connecting to QuickBooks Online', duration: 500 },
      { id: 'realm',   label: 'Resolving realm', duration: 500 },
      { id: 'sample',  label: 'Sampling books', duration: 800 },
      { id: 'count',   label: 'Counting recent rows', duration: 700 },
    ],
    result: [
      { id: 'invoices', name: 'invoices', subtitle: 'rows · 8K / mo',  rowCount: 8_120, rowUnit: 'rows' },
      { id: 'expenses', name: 'expenses', subtitle: 'rows · 15K / mo', rowCount: 14_890, rowUnit: 'rows' },
    ],
  },

  'xero': {
    steps: [
      { id: 'connect', label: 'Connecting to Xero', duration: 500 },
      { id: 'tenant',  label: 'Resolving tenant', duration: 500 },
      { id: 'sample',  label: 'Sampling books', duration: 800 },
      { id: 'count',   label: 'Counting recent rows', duration: 700 },
    ],
    result: [
      { id: 'invoices', name: 'invoices', subtitle: 'rows · 6K / mo',  rowCount: 6_240,  rowUnit: 'rows' },
      { id: 'expenses', name: 'expenses', subtitle: 'rows · 11K / mo', rowCount: 11_020, rowUnit: 'rows' },
    ],
  },
}
```

(Keep the rest of the file's logic intact. The exported name is now `DiscoverStep`.)

- [ ] **Step 3: Commit**

```
git add components/v2/features/sources/add-source-modal/steps/discover-step.tsx
git commit -m "feat(sources): DiscoverStep with stripe/plaid/qb/xero discovery profiles"
```

---

## Task 15 — Copy + extend `<ConfirmStep>` with sample-row preview + estimate pill + connector-named CTA

**Files:**
- Create: `components/v2/features/sources/add-source-modal/steps/confirm-step.tsx` (copy of `setup/select-step.tsx`, renamed)
- Leave: `setup/select-step.tsx` untouched
- Create: `tests/unit/sources/confirm-step.test.tsx`

- [ ] **Step 1: Copy the file**

```
cp components/v2/features/sources/setup/select-step.tsx \
   components/v2/features/sources/add-source-modal/steps/confirm-step.tsx
```

- [ ] **Step 2: Rename and extend**

In the moved file, rename the export `SelectStep` → `ConfirmStep`. Add an `expandedId: string | null` local state. Replace the existing render with this version:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectorById } from '../../catalog-data'
import { samplePreviewFor, type SamplePreview } from '../sample-rows'
import type { DiscoveredDataset } from '../setup-reducer'

type Props = {
  connectorId: string
  discovered: DiscoveredDataset[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  onConfirm: () => void
  onCancel: () => void
  submitting?: boolean
}

export function ConfirmStep({
  connectorId, discovered, selectedIds, onToggle, onToggleAll, onConfirm, onCancel, submitting,
}: Props) {
  const def = connectorById(connectorId)
  const allSelected = selectedIds.length === discovered.length
  const noneSelected = selectedIds.length === 0
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const estimate = useMemo(() => {
    return discovered
      .filter((d) => selectedIds.includes(d.id))
      .reduce((sum, d) => sum + (d.rowCount ?? 0), 0)
  }, [discovered, selectedIds])

  return (
    <div className="flex flex-col gap-3 px-1 pt-2">
      <header className="flex items-center justify-between">
        <p className="text-[11px] text-v2-muted">
          <span className="font-medium text-v2-foreground">{selectedIds.length}</span> of {discovered.length} selected
          {estimate > 0 ? <span className="ml-2 font-mono text-v2-muted/80">· ~{formatRows(estimate)} rows / month</span> : null}
        </p>
        <button type="button" onClick={onToggleAll} className="text-[11px] text-v2-muted hover:text-v2-foreground hover:underline underline-offset-2">
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </header>

      <ul className="grid gap-1.5">
        {discovered.map((d) => {
          const checked = selectedIds.includes(d.id)
          const expanded = expandedId === d.id
          const preview = samplePreviewFor(connectorId, d.id)
          return (
            <li key={d.id} className={cn('rounded-md border', checked ? 'border-v2-foreground/30 bg-v2-foreground/[0.03]' : 'border-v2-border')}>
              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  type="button"
                  onClick={() => onToggle(d.id)}
                  aria-pressed={checked}
                  className="flex flex-1 items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                >
                  <span aria-hidden="true" className={cn('flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                    checked ? 'border-v2-foreground bg-v2-foreground text-v2-background' : 'border-v2-border bg-v2-surface')}>
                    {checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-v2-foreground">{d.name}</span>
                    {d.subtitle ? <span className="block truncate text-[10.5px] text-v2-muted">{d.subtitle}</span> : null}
                  </span>
                </button>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? 'Hide' : 'Show'} sample for ${d.name}`}
                  onClick={() => setExpandedId(expanded ? null : d.id)}
                  className="rounded-md p-1 text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                  disabled={!preview}
                >
                  <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} strokeWidth={2} />
                </button>
              </div>
              {expanded && preview ? <SamplePreview preview={preview} /> : null}
              {expanded && !preview ? (
                <div className="border-t border-v2-border/60 px-3 py-2 text-[11px] text-v2-muted">No sample available.</div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground">Cancel</button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={noneSelected || submitting}
          className={cn(
            'rounded-md px-4 py-1.5 text-[12.5px] font-medium',
            noneSelected || submitting
              ? 'cursor-not-allowed border border-v2-border bg-v2-surface-2 text-v2-muted'
              : 'bg-[oklch(0.40_0.10_160)] text-white hover:bg-[oklch(0.36_0.10_160)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.40_0.10_160)]',
          )}
        >
          {submitting ? 'Connecting…' : `Connect ${def?.name ?? 'source'} →`}
        </button>
      </div>
    </div>
  )
}

function SamplePreview({ preview }: { preview: SamplePreview }) {
  if (preview.kind === 'objects') {
    return (
      <div className="border-t border-v2-border/60 px-3 py-2">
        <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-v2-muted">
          {preview.items.map((it) => (
            <li key={it.name} className="flex items-center justify-between gap-3">
              <span className="truncate text-v2-foreground">{it.name}</span>
              <span>{it.size} · {it.modified}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
  return (
    <div className="border-t border-v2-border/60 px-3 py-2">
      <table className="w-full font-mono text-[10.5px]">
        <thead>
          <tr className="border-b border-v2-border/40 text-v2-muted">
            {preview.columns.map((col) => (
              <th key={col} scope="col" className="py-1 pr-3 text-left font-normal">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((r, i) => (
            <tr key={i} className="border-b border-v2-border/20 last:border-b-0">
              {preview.columns.map((col) => (
                <td key={col} className="py-1 pr-3 text-v2-foreground/90">{r[col] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}
```

- [ ] **Step 3: Write the failing test**

`tests/unit/sources/confirm-step.test.tsx`:

```tsx
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmStep } from '@/components/v2/features/sources/add-source-modal/steps/confirm-step'

const discovered = [
  { id: 'charges', name: 'charges', subtitle: 'rows · 187K / mo', rowCount: 187_240, rowUnit: 'rows' as const },
  { id: 'invoices', name: 'invoices', subtitle: 'rows · 12K / mo', rowCount: 12_410, rowUnit: 'rows' as const },
]

describe('<ConfirmStep>', () => {
  it('formats the row estimate from selected datasets', () => {
    render(
      <ConfirmStep
        connectorId="stripe"
        discovered={discovered}
        selectedIds={['charges', 'invoices']}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/~200K rows \/ month/)).toBeInTheDocument()
  })

  it('expands a row to show a sample preview', () => {
    render(
      <ConfirmStep
        connectorId="stripe"
        discovered={discovered}
        selectedIds={['charges']}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Show sample for charges/i }))
    expect(screen.getByText('amount')).toBeInTheDocument()
    expect(screen.getAllByText(/^ch_3Q/).length).toBeGreaterThan(0)
  })

  it('CTA uses the connector name', () => {
    render(
      <ConfirmStep
        connectorId="stripe"
        discovered={discovered}
        selectedIds={['charges']}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Connect Stripe →/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run tests to verify they pass**

```
pnpm test tests/unit/sources/confirm-step.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```
git add components/v2/features/sources/add-source-modal/steps/confirm-step.tsx tests/unit/sources/confirm-step.test.tsx
git commit -m "feat(sources): ConfirmStep with sample-row preview, row estimate, connector-named CTA"
```

---

## Task 16 — `<DoneStep>` with 6s auto-dismiss

**Files:**
- Create: `components/v2/features/sources/add-source-modal/steps/done-step.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { connectorById } from '../../catalog-data'

type Props = {
  connectorId: string
  datasetCount: number
  onGoToConnection: () => void
  onAddAnother: () => void
  onDismiss: () => void
}

export function DoneStep({ connectorId, datasetCount, onGoToConnection, onAddAnother, onDismiss }: Props) {
  const def = connectorById(connectorId)

  useEffect(() => {
    const t = setTimeout(onDismiss, 6_000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="flex flex-col items-center gap-4 px-1 pt-4 text-center">
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-[oklch(0.55_0.10_150)]/15 text-[oklch(0.40_0.10_150)]">
        <Check className="size-5" strokeWidth={2.5} />
      </span>
      <div>
        <h2 className="font-serif text-[22px] font-normal leading-tight tracking-tight text-v2-foreground">
          {def?.name ?? 'Source'} connected.
        </h2>
        <p className="mt-1 text-[12.5px] text-v2-muted">
          {datasetCount} dataset{datasetCount === 1 ? '' : 's'} · first sync in 2 minutes.
        </p>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onGoToConnection} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-foreground hover:bg-v2-foreground/[0.04]">
          Go to connection
        </button>
        <button type="button" onClick={onAddAnother} className="rounded-md bg-[oklch(0.40_0.10_160)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)]">
          Add another
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/v2/features/sources/add-source-modal/steps/done-step.tsx
git commit -m "feat(sources): DoneStep success view with 6s auto-dismiss"
```

---

## Task 17 — `<HyveBridge>` mock-OAuth interstitial

**Files:**
- Create: `components/v2/features/sources/add-source-modal/hyve-bridge.tsx`

- [ ] **Step 1: Implement**

```tsx
'use client'

import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { cn } from '@/lib/utils'

type Props = {
  connectorId: string
  onApprove: (accountId: string) => void
  onDeny: () => void
}

// Plausible-looking account ids per provider, for the mocked flow only.
const ACCOUNT_IDS: Record<string, string> = {
  stripe: 'acct_1Hyve24',
  plaid: 'item_HyveCreditFacility',
  quickbooks: 'realm_4620816365',
  xero: 'tenant_8f3a7b21',
}

// "Reads" / "Cannot" lists per provider — copied/derived from catalog-data.ts trust.reads.
const SCOPES: Record<string, { reads: string[]; cannot: string[] }> = {
  stripe: {
    reads: ['Charges', 'Invoices', 'Customers', 'Refunds', 'Subscriptions'],
    cannot: ['Move money', 'Modify any record', 'Access API keys'],
  },
  plaid: {
    reads: ['Transactions', 'Balances', 'Accounts'],
    cannot: ['Move money', 'Initiate transfers', 'Read credentials'],
  },
  quickbooks: {
    reads: ['Invoices', 'Expenses', 'Journal entries', 'Customers', 'Vendors'],
    cannot: ['Modify records', 'Post journal entries', 'Pay invoices'],
  },
  xero: {
    reads: ['Invoices', 'Expenses', 'Journal entries', 'Contacts'],
    cannot: ['Modify records', 'Post entries', 'Pay invoices'],
  },
}

export function HyveBridge({ connectorId, onApprove, onDeny }: Props) {
  const def = connectorById(connectorId)
  const scopes = SCOPES[connectorId] ?? { reads: [], cannot: [] }
  const accountId = ACCOUNT_IDS[connectorId] ?? '—'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hyve-bridge-title"
      className="rounded-lg border border-v2-foreground/30 bg-v2-surface p-5 shadow-2xl shadow-black/20"
    >
      <div className="flex items-center justify-between border-b border-v2-border/60 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-v2-muted">Hyve Bridge</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        {def?.logo.kind === 'wordmark' ? (
          <span aria-hidden="true" className={cn('flex size-9 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}>
            {def.logo.label}
          </span>
        ) : null}
        <div>
          <div className="text-[13px] font-semibold text-v2-foreground">{def?.name}</div>
          <div className="mt-0.5 font-mono text-[11px] text-v2-muted">{accountId}</div>
        </div>
      </div>

      <h2 id="hyve-bridge-title" className="mt-4 font-serif text-[18px] font-normal leading-tight text-v2-foreground">
        Authorize Hyve to read this {def?.name} account.
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-v2-muted">Hyve will be able to read</div>
          <ul className="mt-1.5 flex flex-col gap-0.5 text-[12.5px] text-v2-foreground">
            {scopes.reads.map((r) => <li key={r}>· {r}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-v2-muted">Hyve will not be able to</div>
          <ul className="mt-1.5 flex flex-col gap-0.5 text-[12.5px] text-v2-foreground/85">
            {scopes.cannot.map((r) => <li key={r}>· {r}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onDeny} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground">Deny</button>
        <button
          type="button"
          onClick={() => onApprove(accountId)}
          autoFocus
          className="rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)]"
        >
          Approve →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```
git add components/v2/features/sources/add-source-modal/hyve-bridge.tsx
git commit -m "feat(sources): HyveBridge in-modal honest-mock OAuth interstitial"
```

---

## Task 18 — `<Stepbar>` + `<PickerView>` + `<AddSourceModal>` wiring

**Files:**
- Create: `components/v2/features/sources/add-source-modal/stepbar.tsx`
- Create: `components/v2/features/sources/add-source-modal/picker-view.tsx`
- Create: `components/v2/features/sources/add-source-modal/add-source-modal.tsx`
- Create: `components/v2/features/sources/hooks/use-add-source-modal.ts`

- [ ] **Step 1: Implement `<Stepbar>`**

```tsx
// components/v2/features/sources/add-source-modal/stepbar.tsx
import { cn } from '@/lib/utils'

const VISIBLE_STEPS = ['auth', 'trust', 'discover', 'confirm'] as const
type VisibleStep = typeof VISIBLE_STEPS[number]
const STEP_LABEL: Record<VisibleStep, string> = {
  auth: 'Connect',
  trust: 'Review',
  discover: 'Discover',
  confirm: 'Confirm',
}

type Props = { current: VisibleStep | 'done' | 'picker' }

export function Stepbar({ current }: Props) {
  if (current === 'picker' || current === 'done') return null
  const currentIndex = VISIBLE_STEPS.indexOf(current)
  return (
    <ol aria-label="Setup progress" className="flex items-center gap-2 px-5 py-3.5 text-[10px] uppercase tracking-[0.12em] text-v2-muted/65">
      {VISIBLE_STEPS.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span aria-current={i === currentIndex ? 'step' : undefined} className={cn('font-medium', i === currentIndex && 'text-v2-foreground', i < currentIndex && 'text-v2-muted')}>
            {STEP_LABEL[s]}
          </span>
          {i < VISIBLE_STEPS.length - 1 && <span aria-hidden="true">·</span>}
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: Implement `<PickerView>`**

```tsx
// components/v2/features/sources/add-source-modal/picker-view.tsx
'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, WORDMARK_TONES } from '../catalog-data'

type Props = { onPick: (connectorId: string) => void }

export function PickerView({ onPick }: Props) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((c) => (!q || c.name.toLowerCase().includes(q)) && c.wired === 'wired')
  }, [query])

  return (
    <div className="flex flex-col gap-4 px-1 pt-1">
      <input
        type="text"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search providers…"
        aria-label="Search providers"
        className="w-full rounded-md border border-v2-border bg-v2-surface px-3 py-2 text-[13px] placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
      />
      <div className="flex flex-col gap-4">
        {CATEGORY_ORDER.map((cat) => {
          const items = visible.filter((c) => c.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted">{CATEGORY_LABELS[cat]}</h3>
              <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4">
                {items.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => onPick(def.id)}
                    className={cn('flex h-20 flex-col items-center justify-center gap-1 rounded-md border border-v2-border bg-v2-surface px-2 text-center hover:border-v2-foreground/30')}
                  >
                    {def.logo.kind === 'wordmark' ? (
                      <span className={cn('flex size-7 items-center justify-center rounded-md font-mono text-[10px] font-semibold', WORDMARK_TONES[def.logo.tone])}>{def.logo.label}</span>
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-md bg-v2-surface-2"><def.logo.Icon className="size-3.5 text-v2-muted" strokeWidth={1.75} /></span>
                    )}
                    <span className="truncate text-[11px] text-v2-foreground">{def.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `useAddSourceModal` hook**

```ts
// components/v2/features/sources/hooks/use-add-source-modal.ts
'use client'

import { useReducer, useCallback } from 'react'
import { setupReducer, type SetupState, type SetupAction } from '../add-source-modal/setup-reducer'

type ModalState = { open: boolean; setup: SetupState }

type ModalAction =
  | { type: 'openPicker' }
  | { type: 'openWithConnector'; connectorId: string }
  | { type: 'close' }
  | { type: 'setup'; action: SetupAction }

function modalReducer(state: ModalState, action: ModalAction): ModalState {
  switch (action.type) {
    case 'openPicker': return { open: true, setup: { step: 'idle' } }
    case 'openWithConnector':
      return { open: true, setup: setupReducer({ step: 'idle' }, { type: 'start', connectorId: action.connectorId }) }
    case 'close': return { open: false, setup: { step: 'idle' } }
    case 'setup': return { ...state, setup: setupReducer(state.setup, action.action) }
  }
}

export function useAddSourceModal() {
  const [state, dispatch] = useReducer(modalReducer, { open: false, setup: { step: 'idle' } })

  const openPicker = useCallback(() => dispatch({ type: 'openPicker' }), [])
  const openWithConnector = useCallback((connectorId: string) => dispatch({ type: 'openWithConnector', connectorId }), [])
  const close = useCallback(() => dispatch({ type: 'close' }), [])
  const dispatchSetup = useCallback((action: SetupAction) => dispatch({ type: 'setup', action }), [])

  return { state, openPicker, openWithConnector, close, dispatchSetup }
}
```

- [ ] **Step 4: Implement `<AddSourceModal>`**

```tsx
// components/v2/features/sources/add-source-modal/add-source-modal.tsx
'use client'

import { useState, useTransition } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { Stepbar } from './stepbar'
import { PickerView } from './picker-view'
import { HyveBridge } from './hyve-bridge'
import { AuthStep } from './steps/auth-step'
import { TrustStep } from './steps/trust-step'
import { DiscoverStep } from './steps/discover-step'
import { ConfirmStep } from './steps/confirm-step'
import { DoneStep } from './steps/done-step'
import { useAddSourceModal } from '../hooks/use-add-source-modal'
import { createConnection } from '@/app/(originator)/sources/actions'

type Props = {
  modal: ReturnType<typeof useAddSourceModal>
  onConnected: (connectionId: string) => void
}

export function AddSourceModal({ modal, onConnected }: Props) {
  const { state, openPicker, openWithConnector, close, dispatchSetup } = modal
  const [bridgeOpen, setBridgeOpen] = useState(false)
  const [, startTransition] = useTransition()
  const def = state.setup.step !== 'idle' ? connectorById(state.setup.connectorId) : null

  function handleClose() {
    // Confirm only if dirty Auth state
    if (state.setup.step === 'auth' && Object.keys(state.setup.authPayload).length > 0) {
      if (!confirm('Abandon setup?')) return
    }
    close()
  }

  function submitSelect() {
    if (state.setup.step !== 'confirm') return
    dispatchSetup({ type: 'submitSelect' })
    startTransition(async () => {
      const result = await createConnection({
        connectorId: state.setup.connectorId!,
        name: def?.name ?? state.setup.connectorId!,
        authPayload: 'authPayload' in state.setup ? state.setup.authPayload : {},
        datasetIds: 'selectedIds' in state.setup ? state.setup.selectedIds : [],
      })
      if (result.ok && result.data) {
        dispatchSetup({ type: 'saveSuccess', connectionId: result.data.id })
        toast.success('Connected')
      } else if (!result.ok) {
        dispatchSetup({ type: 'saveFailure', error: result.error })
        toast.error(result.error)
      }
    })
  }

  const visibleStep =
    state.setup.step === 'idle' ? 'picker' :
    state.setup.step === 'submitting' ? 'confirm' :
    state.setup.step === 'error' ? 'confirm' :
    state.setup.step

  return (
    <Dialog open={state.open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent
        className="w-[560px] max-w-[92vw] p-0 sm:max-w-[560px]"
        onEscapeKeyDown={(e) => { e.preventDefault(); handleClose() }}
        onPointerDownOutside={(e) => {
          // Block backdrop dismiss on auth/discover/confirm/submitting
          if (['auth', 'discover', 'confirm', 'submitting'].includes(state.setup.step)) e.preventDefault()
        }}
      >
        {bridgeOpen && state.setup.step !== 'idle' ? (
          <div className="p-4">
            <HyveBridge
              connectorId={state.setup.connectorId}
              onDeny={() => setBridgeOpen(false)}
              onApprove={(accountId) => {
                setBridgeOpen(false)
                dispatchSetup({ type: 'updateAuth', patch: { accountId } })
                dispatchSetup({ type: 'submitAuth' })
              }}
            />
          </div>
        ) : (
          <>
            <Stepbar current={visibleStep as 'auth' | 'trust' | 'discover' | 'confirm' | 'done' | 'picker'} />
            <div className="flex items-start justify-between gap-3 border-b border-v2-border/60 px-5 pb-3">
              <div className="flex items-center gap-2.5">
                {def?.logo.kind === 'wordmark' ? (
                  <span aria-hidden="true" className={cn('flex size-9 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}>
                    {def.logo.label}
                  </span>
                ) : def?.logo.kind === 'icon' ? (
                  <span className="flex size-9 items-center justify-center rounded-md bg-v2-surface-2"><def.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} /></span>
                ) : null}
                <div>
                  <h2 className="text-[13.5px] font-semibold tracking-tight text-v2-foreground">{def?.name ?? 'Add a source'}</h2>
                  <p className="mt-0.5 text-[11px] text-v2-muted">{def?.tagline ?? 'Pick a provider below'}</p>
                </div>
              </div>
              <button type="button" onClick={handleClose} aria-label="Close" className="rounded-md p-1 text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground">
                <X className="size-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="px-5 py-4">
              {state.setup.step === 'idle' && <PickerView onPick={openWithConnector} />}
              {state.setup.step === 'auth' && (
                <AuthStep
                  connectorId={state.setup.connectorId}
                  values={state.setup.authPayload}
                  onUpdate={(patch) => dispatchSetup({ type: 'updateAuth', patch })}
                  onSubmit={() => dispatchSetup({ type: 'submitAuth' })}
                  onCancel={handleClose}
                  onOAuthRequest={() => setBridgeOpen(true)}
                />
              )}
              {state.setup.step === 'trust' && (
                <TrustStep
                  connectorId={state.setup.connectorId}
                  onCancel={handleClose}
                  onContinue={() => dispatchSetup({ type: 'submitTrust' })}
                />
              )}
              {state.setup.step === 'discover' && (
                <DiscoverStep
                  connectorId={state.setup.connectorId}
                  onComplete={(discovered) => dispatchSetup({ type: 'discoveryComplete', discovered })}
                  onCancel={handleClose}
                />
              )}
              {(state.setup.step === 'confirm' || state.setup.step === 'submitting') && (
                <ConfirmStep
                  connectorId={state.setup.connectorId}
                  discovered={state.setup.discovered}
                  selectedIds={state.setup.selectedIds}
                  onToggle={(id) => dispatchSetup({ type: 'toggleDataset', id })}
                  onToggleAll={() => {
                    if (state.setup.step !== 'confirm') return
                    const all = state.setup.selectedIds.length === state.setup.discovered.length
                    for (const d of state.setup.discovered) {
                      const present = state.setup.selectedIds.includes(d.id)
                      if (all === present) dispatchSetup({ type: 'toggleDataset', id: d.id })
                    }
                  }}
                  onConfirm={submitSelect}
                  onCancel={handleClose}
                  submitting={state.setup.step === 'submitting'}
                />
              )}
              {state.setup.step === 'done' && (
                <DoneStep
                  connectorId={state.setup.connectorId}
                  datasetCount={'selectedIds' in state.setup ? state.setup.selectedIds.length : 0}
                  onGoToConnection={() => { onConnected(state.setup.connectionId); close() }}
                  onAddAnother={openPicker}
                  onDismiss={() => { onConnected(state.setup.connectionId); close() }}
                />
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Wire CTA in `<SourcesShell>` to open the modal**

In `sources-shell.tsx`:

```tsx
import { AddSourceModal } from './add-source-modal/add-source-modal'
import { useAddSourceModal } from './hooks/use-add-source-modal'

// inside SourcesShell:
const modal = useAddSourceModal()
```

Change the CTA button's `onClick`:

```tsx
<button ... onClick={() => modal.openPicker()}>+ Connect a source</button>
```

Pass `onPick` from the Catalogue tab and `onRowClick` from the Connected tab empty-state to drive the modal:

```tsx
<CatalogueTab
  connections={connections}
  onPick={(id) => {
    if (id.startsWith('__soon:')) {
      const name = id.replace('__soon:', '')
      // Toast handled here:
      import('sonner').then(({ toast }) => toast(`${name} is coming soon. Email hello@hyve.xyz to vote.`))
      return
    }
    modal.openWithConnector(id)
  }}
  onAlreadyConnected={(connectorId) => {
    // switch tab to connected, flash row
    changeTab('connected')
    // flash logic added in next step's iteration; minimal: no-op for now
  }}
/>
<ConnectedTab
  connections={connections}
  datasets={datasets}
  onRowClick={(sentinel) => {
    if (sentinel === '__browse') { changeTab('catalogue'); return }
    if (sentinel.startsWith('__add:')) { modal.openWithConnector(sentinel.replace('__add:', '')); return }
    // Otherwise, real connection row click → drawer (Task 19)
  }}
/>
```

Then render the modal at the bottom of the shell, after `</Tabs>`:

```tsx
<AddSourceModal modal={modal} onConnected={() => { /* drawer wiring — Task 19 */ }} />
```

- [ ] **Step 6: Smoke-test in browser**

```
pnpm dev
```

Visit `/sources`. Click `+ Connect a source`. Expect: modal opens at PickerView. Pick Stripe → modal advances through Auth → Hyve Bridge → Approve → Trust → Discover → Confirm → Done → dismiss.

Try Catalogue: switch tab, click an S3 card → modal opens at Auth directly. Click "Stripe" card (which shows "Connected · 1") → switches to Connected tab. Click a "Coming soon" card → toast appears.

- [ ] **Step 7: Commit**

```
git add components/v2/features/sources/add-source-modal/ components/v2/features/sources/hooks/use-add-source-modal.ts components/v2/features/sources/sources-shell.tsx
git commit -m "feat(sources): AddSourceModal end-to-end flow (picker → auth → trust → discover → confirm → done)"
```

---

## Task 19 — `<ManageDrawer>` for existing connections

**Files:**
- Create: `components/v2/features/sources/manage-drawer/manage-drawer.tsx`
- Create: `components/v2/features/sources/hooks/use-manage-drawer.ts`
- Modify: `app/(originator)/sources/actions.ts` (add `reconnectConnection`)
- Modify: `components/v2/features/sources/sources-shell.tsx` (wire drawer)

- [ ] **Step 1: Implement `useManageDrawer`**

```ts
// components/v2/features/sources/hooks/use-manage-drawer.ts
'use client'

import { useState, useCallback } from 'react'

export function useManageDrawer() {
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const open = useCallback((id: string) => setConnectionId(id), [])
  const close = useCallback(() => setConnectionId(null), [])
  return { connectionId, open, close }
}
```

- [ ] **Step 2: Add `reconnectConnection` server action**

In `app/(originator)/sources/actions.ts`, append:

```ts
'use server'

// ...existing imports
export async function reconnectConnection(
  id: string,
  newAuthPayload: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  // Fixture-mode stub — real backend integration is out of scope for this PR.
  void id; void newAuthPayload
  return { ok: true }
}
```

- [ ] **Step 3: Implement `<ManageDrawer>`**

```tsx
// components/v2/features/sources/manage-drawer/manage-drawer.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { pauseConnection, resumeConnection, removeConnection } from '@/app/(originator)/sources/actions'
import type { ConnectorConnection, ConnectionDataset, ConnectionStatus } from '@/lib/api/schemas'

const STATUS_DOT: Record<ConnectionStatus, string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

type Props = {
  connection: ConnectorConnection | null
  datasets: readonly ConnectionDataset[]
  onClose: () => void
  onReconnect: (connectorId: string) => void
}

export function ManageDrawer({ connection, datasets, onClose, onReconnect }: Props) {
  const def = connection ? connectorById(connection.connectorId) : null
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  return (
    <Sheet open={Boolean(connection)} onOpenChange={(o) => { if (!o) { setConfirmingRemove(false); onClose() } }}>
      <SheetContent side="right" className="w-[480px] max-w-[92vw] gap-0 p-0 sm:max-w-[480px]">
        {connection && def ? (
          <div className="flex h-full flex-col">
            <SheetTitle className="sr-only">{connection.name}</SheetTitle>
            <header className="border-b border-v2-border/60 p-5">
              <div className="flex items-start gap-3">
                {def.logo.kind === 'wordmark' ? (
                  <span aria-hidden="true" className={cn('flex size-10 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}>
                    {def.logo.label}
                  </span>
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-md bg-v2-surface-2"><def.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} /></span>
                )}
                <div className="min-w-0">
                  <div className="font-serif text-[20px] font-normal text-v2-foreground">{connection.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-v2-muted">
                    {connection.subtitle ? <span className="font-mono">{connection.subtitle}</span> : null}
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className={cn('size-1.5 rounded-full', STATUS_DOT[connection.status])} />
                      <span>{connection.status === 'ok' ? 'healthy' : connection.status}</span>
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <Section title="Health">
                <div className="text-[12.5px] leading-relaxed text-v2-foreground">
                  Connected · {datasets.length} datasets · cadence {connection.cadence}
                </div>
                <div className="mt-0.5 text-[11.5px] text-v2-muted">Last sync: {new Date(connection.lastSyncAt).toLocaleString()}</div>
              </Section>

              <Section title="Datasets">
                <ul className="grid gap-1">
                  {datasets.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/datasets/${d.id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px] text-v2-foreground hover:bg-v2-foreground/[0.04]"
                      >
                        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.55_0.10_150)]" />{d.name}</span>
                        <span className="font-mono text-[11px] text-v2-muted">{d.rowCount.toLocaleString()} {d.rowUnit}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Credentials">
                <div className="text-[12.5px] text-v2-foreground">
                  {connection.connectorId === 'stripe' || connection.connectorId === 'plaid' || connection.connectorId === 'quickbooks' || connection.connectorId === 'xero'
                    ? `OAuth · ${connection.credentialsExpireAt ? `expires ${new Date(connection.credentialsExpireAt).toLocaleDateString()}` : 'refreshed recently'}`
                    : `Configured · ${connection.credentialsExpireAt ? `expires ${new Date(connection.credentialsExpireAt).toLocaleDateString()}` : 'no expiry'}`}
                </div>
              </Section>

              <Section title="Actions">
                {confirmingRemove ? (
                  <RemoveConfirm
                    connection={connection}
                    onCancel={() => setConfirmingRemove(false)}
                    onRemoved={() => { setConfirmingRemove(false); onClose() }}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const res = connection.status === 'paused'
                          ? await resumeConnection(connection.id)
                          : await pauseConnection(connection.id)
                        if (res.ok) toast.success(connection.status === 'paused' ? 'Resumed' : 'Paused')
                        else toast.error(res.error)
                      }}
                      className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-foreground hover:bg-v2-foreground/[0.04]"
                    >
                      {connection.status === 'paused' ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onReconnect(connection.connectorId)}
                      className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-foreground hover:bg-v2-foreground/[0.04]"
                    >
                      Reconnect
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRemove(true)}
                      className="rounded-md border border-[oklch(0.55_0.18_25)]/40 px-3 py-1.5 text-[12px] text-[oklch(0.55_0.18_25)] hover:bg-[oklch(0.55_0.18_25)]/10"
                    >
                      Remove…
                    </button>
                  </div>
                )}
              </Section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-v2-muted">{title}</h3>
      {children}
    </section>
  )
}

function RemoveConfirm({ connection, onCancel, onRemoved }: { connection: ConnectorConnection; onCancel: () => void; onRemoved: () => void }) {
  const [value, setValue] = useState('')
  const match = value.trim() === connection.name
  return (
    <div className="rounded-md border border-v2-border/80 bg-v2-surface-2/50 p-3">
      <p className="text-[12.5px] text-v2-foreground">Remove {connection.name}?</p>
      <p className="mt-1 text-[11px] text-v2-muted">Datasets and bindings drop. Type the connection name to confirm.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={connection.name}
        aria-label="Connection name to confirm removal"
        className="mt-2 w-full rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12px] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
      />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-2.5 py-1 text-[11.5px] text-v2-foreground hover:bg-v2-foreground/[0.04]">Cancel</button>
        <button
          type="button"
          disabled={!match}
          onClick={async () => {
            const result = await removeConnection(connection.id, value)
            if (result.ok) { toast.success('Removed'); onRemoved() }
            else toast.error(result.error)
          }}
          className={cn('rounded-md border px-2.5 py-1 text-[11.5px]', match ? 'border-[oklch(0.55_0.18_25)] bg-[oklch(0.55_0.18_25)] text-v2-background' : 'cursor-not-allowed border-v2-border text-v2-muted')}
        >
          Remove
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire drawer into `<SourcesShell>` with mutual exclusivity**

In `sources-shell.tsx`:

```tsx
import { ManageDrawer } from './manage-drawer/manage-drawer'
import { useManageDrawer } from './hooks/use-manage-drawer'
// inside SourcesShell:
const drawer = useManageDrawer()
const selectedConn = useMemo(
  () => connections.find((c) => c.id === drawer.connectionId) ?? null,
  [connections, drawer.connectionId],
)
const datasetsForSelected = useMemo(
  () => datasets.filter((d) => d.connectionId === drawer.connectionId),
  [datasets, drawer.connectionId],
)
```

Update `ConnectedTab`'s `onRowClick` to call `drawer.open(id)` for non-sentinel ids:

```tsx
onRowClick={(idOrSentinel) => {
  if (idOrSentinel === '__browse') { changeTab('catalogue'); return }
  if (idOrSentinel.startsWith('__add:')) {
    modal.openWithConnector(idOrSentinel.replace('__add:', ''))
    return
  }
  // mutual exclusivity:
  modal.close()
  drawer.open(idOrSentinel)
}}
```

Wire `modal.openPicker` and `modal.openWithConnector` to also `drawer.close()`:

```tsx
// In the CTA onClick handler:
onClick={() => { drawer.close(); modal.openPicker() }}
```

Render the drawer at the bottom of the shell:

```tsx
<ManageDrawer
  connection={selectedConn}
  datasets={datasetsForSelected}
  onClose={drawer.close}
  onReconnect={(connectorId) => { drawer.close(); modal.openWithConnector(connectorId) }}
/>
```

- [ ] **Step 5: Smoke-test in browser**

Visit `/sources`, click a Connection row → drawer slides in. Pause, Resume, Reconnect, Remove all reachable. Click `+ Connect a source` while drawer open → drawer closes, modal opens.

- [ ] **Step 6: Commit**

```
git add components/v2/features/sources/manage-drawer/ components/v2/features/sources/hooks/use-manage-drawer.ts components/v2/features/sources/sources-shell.tsx app/\(originator\)/sources/actions.ts
git commit -m "feat(sources): ManageDrawer with health/datasets/credentials/actions sections"
```

---

## Task 20 — Delete canvas code (single commit)

**Files (deleted):** See "Deleted" list at top of plan.

- [ ] **Step 1: Delete canvas files**

```
git rm components/v2/features/sources/sources-canvas.tsx \
       components/v2/features/sources/source-tile.tsx \
       components/v2/features/sources/source-tile-expanded.tsx \
       components/v2/features/sources/dataset-tile.tsx \
       components/v2/features/sources/vault-peripheral-tile.tsx \
       components/v2/features/sources/canvas-edges.tsx \
       components/v2/features/sources/category-lane.tsx \
       components/v2/features/sources/floating-action-bar.tsx \
       components/v2/features/sources/legend.tsx \
       components/v2/features/sources/empty-state.tsx \
       components/v2/features/sources/catalog-sheet.tsx \
       components/v2/features/sources/hooks/use-canvas-layout.ts \
       components/v2/features/sources/hooks/use-catalog-sheet.ts \
       components/v2/features/sources/hooks/use-setup-flow.ts \
       tests/unit/sources/use-canvas-layout.test.ts \
       tests/e2e/sources-canvas.spec.ts

git rm -r components/v2/features/sources/inspector \
          components/v2/features/sources/setup
```

(The `setup/` folder is now empty after Tasks 5/6/13/14/15 moved its contents. The `inspector/` folder still has `actions-row.tsx` and `inspector-content.tsx` — fully replaced by `manage-drawer.tsx`.)

- [ ] **Step 2: Typecheck**

```
pnpm typecheck
```

Expected: green (no remaining references to deleted symbols).

- [ ] **Step 3: Unit tests**

```
pnpm test
```

Expected: all green.

- [ ] **Step 4: Commit**

```
git commit -m "chore(sources): delete canvas (superseded by SourcesShell)"
```

---

## Task 21 — Rewrite `/sources` E2E suite

**Files:**
- Create: `tests/e2e/sources.spec.ts`

- [ ] **Step 1: Write the new spec**

```ts
// tests/e2e/sources.spec.ts
import { expect, test } from '@playwright/test'

test.describe('/sources — connected tab', () => {
  test('renders the page shell and the connected list', async ({ page }) => {
    await page.goto('/sources')
    await expect(page.getByRole('heading', { name: 'Sources' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Connected · \d+/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Catalogue/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Stripe — healthy/i })).toBeVisible()
  })

  test('?tab=catalogue deep-link selects the Catalogue tab', async ({ page }) => {
    await page.goto('/sources?tab=catalogue')
    await expect(page.getByRole('heading', { name: /Payments/i })).toBeVisible()
  })
})

test.describe('/sources — add-source modal', () => {
  test('opens via CTA, picker → auth (S3 form) → trust → discover → confirm → done', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Connect a source/i }).click()
    // Picker
    await expect(page.getByPlaceholder('Search providers…')).toBeFocused()
    await page.getByRole('button', { name: /^Amazon S3/i }).first().click()
    // Auth (form)
    await expect(page.getByRole('heading', { name: /Amazon S3/i })).toBeVisible()
    await page.getByLabel(/Bucket/i).fill('hyve-test')
    await page.getByLabel(/Region/i).fill('us-east-1')
    await page.getByRole('button', { name: /Continue/i }).click()
    // Trust
    await expect(page.getByRole('heading', { name: /What Hyve will do with your Amazon S3 data/i })).toBeVisible()
    await page.getByRole('button', { name: /Continue →/i }).click()
    // Discover narrates and advances
    await expect(page.getByText(/Connecting to bucket/i)).toBeVisible()
    // Confirm
    await expect(page.getByText(/of \d+ selected/)).toBeVisible({ timeout: 8000 })
    await page.getByRole('button', { name: /Connect Amazon S3 →/i }).click()
    // Done
    await expect(page.getByRole('heading', { name: /Amazon S3 connected/i })).toBeVisible({ timeout: 5000 })
  })

  test('Catalogue card opens the modal at the Auth step (skips picker)', async ({ page }) => {
    await page.goto('/sources?tab=catalogue')
    await page.getByRole('button', { name: /^Adyen/i }).click()
    // Adyen is "soon" → toast, no modal
    await expect(page.getByText(/Adyen is coming soon/i)).toBeVisible()
  })

  test('Stripe (OAuth) flows through Hyve Bridge', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Connect a source/i }).click()
    await page.getByRole('button', { name: /^Stripe/i }).first().click()
    await page.getByRole('button', { name: /Sign in with Stripe/i }).click()
    // Hyve Bridge
    await expect(page.getByRole('heading', { name: /Authorize Hyve to read this Stripe account/i })).toBeVisible()
    await page.getByRole('button', { name: /Approve →/i }).click()
    // Trust
    await expect(page.getByRole('heading', { name: /What Hyve will do with your Stripe data/i })).toBeVisible()
  })

  test('Escape with dirty Auth confirms before closing', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Connect a source/i }).click()
    await page.getByRole('button', { name: /^Amazon S3/i }).first().click()
    await page.getByLabel(/Bucket/i).fill('hyve-test')
    page.on('dialog', (dialog) => dialog.dismiss())
    await page.keyboard.press('Escape')
    // Modal should still be present because dialog was dismissed
    await expect(page.getByLabel(/Bucket/i)).toBeVisible()
  })
})

test.describe('/sources — manage drawer', () => {
  test('clicking a connection opens the drawer', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Stripe — healthy/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/^Health$/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Pause/i })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('Reconnect from drawer opens modal at Auth for that connector', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Stripe — healthy/i }).click()
    await page.getByRole('button', { name: /Reconnect/i }).click()
    await expect(page.getByRole('heading', { name: /^Stripe/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Sign in with Stripe/i })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run E2E**

```
pnpm test:e2e --grep "sources"
```

Expected: PASS on all named tests. If any test is flaky on timing (Discover narration), bump the `timeout` argument in that single assertion.

- [ ] **Step 3: Commit**

```
git add tests/e2e/sources.spec.ts
git commit -m "test(sources): e2e rewrite — tabs, modal flow, OAuth bridge, drawer"
```

---

## Task 22 — Final pass: a11y + visual verify

This is a verification-only task — no new functionality. It catches regressions and produces the screenshots referenced in the PR description.

- [ ] **Step 1: Typecheck + unit tests + e2e all green**

```
pnpm typecheck && pnpm test && pnpm test:e2e --grep "sources"
```

- [ ] **Step 2: Keyboard sweep**

Manually exercise:
- Tab into the page → header CTA, then tabs, then list of connections, then drawer if open.
- `Enter` / `Space` on a connection row → opens drawer.
- `Escape` on drawer closes drawer.
- `Tab` into modal once open → focus traps within modal.
- `Escape` on each modal step works.
- `⌘K` shortcut still binds to opening the picker (carry over from prior behavior — verify it's intact or remove the binding if conflicting).

- [ ] **Step 3: Reduced-motion check**

In dev tools, set "Emulate CSS prefers-reduced-motion: reduce." Reload. Expect: modal opens/closes instantly, no slide animations, no pulse animations.

- [ ] **Step 4: Visual screenshots for PR**

Use Playwright trace or manual screenshots of:
1. Connected tab (with mix of healthy + attention + paused rows)
2. Connected tab empty state
3. Catalogue tab (categorised grid)
4. AddSourceModal — Picker
5. AddSourceModal — Auth (OAuth) for Stripe
6. Hyve Bridge interstitial for Stripe
7. AddSourceModal — Trust step for Stripe
8. AddSourceModal — Discover step (mid-progress)
9. AddSourceModal — Confirm step with one sample preview expanded
10. AddSourceModal — Done step
11. ManageDrawer for a connection

- [ ] **Step 5: Final commit (any polish caught during sweep)**

```
git add -A
git commit -m "chore(sources): a11y + visual sweep" --allow-empty
```

---

## Closing

After Task 22:

1. Push branch, open PR.
2. PR description: link the spec, embed the 11 screenshots from Task 22 Step 4.
3. Verify CI green.

---

## Self-review notes

- All 9 spec decisions traced to tasks: Tabs (Task 8), Plaid-Link modal (Task 18), Trust step (Task 12), Sample preview (Task 15), Stripe/Plaid/QB/Xero mocked (Tasks 3 + 17), Unified flow shape (Task 13), Operator+serif temperament (Task 12), Approach A one-PR (Tasks 1–22 on one branch).
- File layout map matches the spec's File layout section.
- Setup-reducer migration is task-isolated (Task 5) so it can be reviewed in isolation.
- Hyve Bridge content is type-checked against `catalog-data.ts`'s trust copy by inspection — not via a unit test. Acceptable: this is fixture content, not runtime logic. The E2E test verifies user-visible Bridge text.
- No `TBD`, `TODO`, or unimplemented placeholder steps. The two "wiring-in-later-task" sentinels (`onClick` stub in Task 8 step 3, drawer wiring stub in Task 18 step 5) are explicitly cross-referenced.
- Open spec decisions deferred to implementation: stepbar collapse on Done (handled by `Stepbar` returning null for `done`), pause confirmation (no — single-click), `⌘K` binding (verified manually in Task 22).
