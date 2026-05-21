# Connector view — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. All UI tasks must run through `hyve-driven-development` (project skill) so the correct specialist agent + mandatory paired reviewers fire.

**Goal:** Build the Atelier Canvas at `/sources` — a single canvas surface showing the full pipeline (sources → datasets → vaults) with inline-on-canvas setup that replaces the legacy modal-driven source picker.

**Architecture:** Server-rendered shell at `app/(originator)/sources/page.tsx` hydrating a client canvas component. Auto-layout algorithm computes tile positions deterministically from the connection list. SVG layer overlays hairline edges. A `useReducer` in the canvas client owns selected-tile / catalog-open / pending-setup state, with setup state mirrored to URL search params for refresh resilience. Catalog opens as a bottom sheet (Radix dialog adapted to slide up). Setup happens inside an expanded tile via a 3-step shell (auth → discover → select → save). All MVP data is fixture-based; server actions stub the persistence layer.

**Tech Stack:**
- Next.js 16 App Router + React 19 Server Components
- TypeScript strict; Zod for response validation
- Tailwind CSS + v2 design tokens (`v2-foreground`, `v2-surface`, `v2-muted`, `v2-border`)
- framer-motion (matches existing v2 animation vocabulary)
- shadcn/ui primitives + project-owned components in `components/v2/features/sources/`
- Vitest (unit) for pure logic; visual verification via Playwright MCP for UI

**Spec:** [`docs/superpowers/specs/2026-05-21-connector-view-design.md`](../specs/2026-05-21-connector-view-design.md)

---

## File map (locked in this plan)

```
app/(originator)/sources/
  page.tsx                       # server: fetches connections, vaults; renders shell
  actions.ts                     # server actions: create / pause / resume / remove / reconfigure
  loading.tsx                    # subtle skeleton
  error.tsx                      # canvas-wrapped error

components/v2/features/sources/
  index.ts                       # public exports
  sources-canvas.tsx             # client orchestrator: state + layout + edges + lanes
  source-tile.tsx                # compact source tile
  source-tile-expanded.tsx       # expanded card (inspector + setup share the shell)
  dataset-tile.tsx               # compact dataset tile
  vault-peripheral-tile.tsx      # peripheral vault tile (right lane)
  canvas-edges.tsx               # SVG edge layer
  category-lane.tsx              # vertical category section + kicker label
  catalog-sheet.tsx              # bottom-sheet catalog with categories + connector cards
  catalog-data.ts                # catalog: categories, connectors, logos, field schemas
  floating-action-bar.tsx        # bottom-center action pill
  empty-state.tsx                # first-time empty canvas state
  legend.tsx                     # bottom-right status legend
  inspector/
    inspector-content.tsx        # detail UI for an existing connection
    actions-row.tsx              # Pause / Reconnect / Remove buttons
    remove-confirm.tsx           # inline "type name to confirm" remover
  setup/
    setup-shell.tsx              # 3-step strip + step routing
    auth-step.tsx                # field-schema-driven auth form
    discovery-step.tsx           # narrated loading (extends SecLoadingView pattern)
    select-step.tsx              # dataset selection (extends SecDatasetsView pattern)
    setup-reducer.ts             # auth → discovery → select → save state machine
    field-schemas.ts             # Zod schemas + render hints per connector type
  hooks/
    use-canvas-layout.ts         # pure: connections+datasets+vaults → positioned items + edges
    use-catalog-sheet.ts         # open/close + ⌘K binding
    use-setup-flow.ts            # URL-synced setup state

lib/api/fixtures/
  connector-canvas.ts            # canvas-specific fixtures: connections, dataset-of-connection, vault-refs

lib/api/schemas.ts               # MODIFY: add ConnectorConnection, ConnectionDataset schemas
lib/api/fixtures/index.ts        # MODIFY: export connector-canvas fixtures
```

Naming: we use **Connection** (not Source) for the canvas-specific entity to avoid colliding with the existing `Source` type used by `(app)/legacy/sources/`. A connection is "a configured instance of a connector type."

---

## Phase A · Data foundation (TDD where pure)

### Task A1: Connection + ConnectionDataset Zod schemas

**Files:**
- Modify: `lib/api/schemas.ts` (append at the bottom)

- [ ] **Step 1: Add the schemas**

Append to `lib/api/schemas.ts`:

```ts
// ---------- Connector canvas (v2 /sources) ----------

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
  'custom',
])
export type ConnectorCategory = z.infer<typeof ConnectorCategorySchema>

export const ConnectionStatusSchema = z.enum(['ok', 'attention', 'error', 'paused'])
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>

export const ConnectorConnectionSchema = z.object({
  id: z.string(),
  connectorId: z.string(),         // e.g. 'sec-edgar', 's3', 'file-upload'
  category: ConnectorCategorySchema,
  name: z.string(),
  subtitle: z.string().optional(), // "NAV · fund admin", "Regulator", etc.
  status: ConnectionStatusSchema,
  lastSyncAt: z.string().datetime(),
  cadence: z.string(),             // human-readable: "5min poll", "event-driven"
  datasetIds: z.array(z.string()),
  credentialsExpireAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
})
export type ConnectorConnection = z.infer<typeof ConnectorConnectionSchema>

export const ConnectionDatasetSchema = z.object({
  id: z.string(),
  connectionId: z.string(),
  name: z.string(),                // "nav.daily", "form_n_port"
  rowCount: z.number().int().nonnegative(),
  rowUnit: z.enum(['rows', 'filings', 'objects', 'events', 'ticks', 'tags']),
  lastSyncAt: z.string().datetime(),
  vaultIds: z.array(z.string()),   // which vaults consume this dataset
})
export type ConnectionDataset = z.infer<typeof ConnectionDatasetSchema>

export const VaultRefSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  sponsor: z.string(),
  palette: z.enum(['forest', 'periwinkle', 'amber', 'rose', 'sky', 'mauve', 'teal']),
  datasetCount: z.number().int().nonnegative(),
  consumerCount: z.number().int().nonnegative(),
})
export type VaultRef = z.infer<typeof VaultRefSchema>
```

- [ ] **Step 2: Commit**

```bash
git add lib/api/schemas.ts
git commit -m "feat(sources): Connection + ConnectionDataset Zod schemas

Models the canvas-specific entities. 'Connection' (not 'Source') to
avoid colliding with the existing legacy Source type. Each connection
references the connector catalog by id and lists its datasets, which
themselves reference consumer vaults."
```

---

### Task A2: Connector catalog data

**Files:**
- Create: `components/v2/features/sources/catalog-data.ts`

- [ ] **Step 1: Create the catalog**

```ts
// components/v2/features/sources/catalog-data.ts
import type { LucideProps } from 'lucide-react'
import { Award, Cable, Database, FileUp, Landmark, LineChart, Link2 } from 'lucide-react'
import type { ConnectorCategory } from '@/lib/api/schemas'

export type ConnectorWired = 'wired' | 'soon'

export type ConnectorDefinition = {
  id: string                                 // 'sec-edgar', 's3', 'file-upload', ...
  category: ConnectorCategory
  name: string
  tagline: string
  wired: ConnectorWired
  /** Render hint: wordmark text + tone, or an icon. */
  logo:
    | { kind: 'wordmark'; label: string; tone: WordmarkTone }
    | { kind: 'icon'; Icon: React.ComponentType<LucideProps> }
}

export type WordmarkTone = 'ink' | 'navy' | 'teal' | 'red' | 'blue' | 'amber' | 'orange' | 'violet'

export const WORDMARK_TONES: Record<WordmarkTone, string> = {
  ink: 'bg-foreground text-background',
  navy: 'bg-[#0b2545] text-white',
  teal: 'bg-[#0f766e] text-white',
  red: 'bg-[#b91c1c] text-white',
  blue: 'bg-[#1d4ed8] text-white',
  amber: 'bg-[#f7a600] text-black',
  orange: 'bg-[#ee7e2a] text-white',
  violet: 'bg-[#5d3fd3] text-white',
}

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
  custom: 'Custom',
}

export const CATALOG: ConnectorDefinition[] = [
  // Fund admin
  { id: 'sfs', category: 'fund-admin', name: 'Securitize Fund Services', tagline: 'NAV · fund admin',
    wired: 'soon', logo: { kind: 'wordmark', label: 'SFS', tone: 'navy' } },
  { id: 'securitize-platform', category: 'fund-admin', name: 'Securitize Platform', tagline: 'Transfer agent',
    wired: 'soon', logo: { kind: 'wordmark', label: 'S', tone: 'teal' } },
  { id: 'allvue', category: 'fund-admin', name: 'Allvue', tagline: 'Fund accounting',
    wired: 'soon', logo: { kind: 'wordmark', label: 'AV', tone: 'ink' } },
  { id: 'ssc-advent', category: 'fund-admin', name: 'SS&C Advent', tagline: 'Geneva · fund admin',
    wired: 'soon', logo: { kind: 'wordmark', label: 'SS', tone: 'ink' } },

  // Regulator
  { id: 'sec-edgar', category: 'regulator', name: 'SEC EDGAR', tagline: 'Regulator',
    wired: 'wired', logo: { kind: 'wordmark', label: 'SEC', tone: 'navy' } },
  { id: 'cftc', category: 'regulator', name: 'CFTC filings', tagline: 'Derivatives regulator',
    wired: 'soon', logo: { kind: 'wordmark', label: 'CFTC', tone: 'navy' } },

  // Storage
  { id: 's3', category: 'storage', name: 'Amazon S3', tagline: 'Object storage',
    wired: 'wired', logo: { kind: 'wordmark', label: 'S3', tone: 'orange' } },
  { id: 'gcs', category: 'storage', name: 'Google Cloud Storage', tagline: 'Object storage',
    wired: 'soon', logo: { kind: 'wordmark', label: 'GCS', tone: 'blue' } },
  { id: 'azure-blob', category: 'storage', name: 'Azure Blob', tagline: 'Object storage',
    wired: 'soon', logo: { kind: 'wordmark', label: 'AZ', tone: 'blue' } },
  { id: 'sftp', category: 'storage', name: 'SFTP', tagline: 'Secure file transfer',
    wired: 'soon', logo: { kind: 'wordmark', label: 'FTP', tone: 'ink' } },
  { id: 'file-upload', category: 'storage', name: 'File upload', tagline: 'CSV · Parquet · JSON',
    wired: 'wired', logo: { kind: 'icon', Icon: FileUp } },

  // Warehouse
  { id: 'snowflake', category: 'warehouse', name: 'Snowflake', tagline: 'Cloud warehouse',
    wired: 'soon', logo: { kind: 'wordmark', label: 'SNW', tone: 'blue' } },
  { id: 'bigquery', category: 'warehouse', name: 'BigQuery', tagline: 'Cloud warehouse',
    wired: 'soon', logo: { kind: 'wordmark', label: 'BQ', tone: 'blue' } },
  { id: 'databricks', category: 'warehouse', name: 'Databricks', tagline: 'Lakehouse',
    wired: 'soon', logo: { kind: 'wordmark', label: 'DB', tone: 'red' } },
  { id: 'redshift', category: 'warehouse', name: 'Redshift', tagline: 'Cloud warehouse',
    wired: 'soon', logo: { kind: 'wordmark', label: 'RS', tone: 'orange' } },

  // On-chain
  { id: 'wormhole', category: 'on-chain', name: 'Wormhole', tagline: 'Cross-chain',
    wired: 'soon', logo: { kind: 'icon', Icon: Cable } },
  { id: 'redstone', category: 'on-chain', name: 'RedStone', tagline: 'On-chain oracle',
    wired: 'soon', logo: { kind: 'wordmark', label: 'R', tone: 'red' } },
  { id: 'pyth', category: 'on-chain', name: 'Pyth Network', tagline: 'Pull oracle',
    wired: 'soon', logo: { kind: 'wordmark', label: 'P', tone: 'violet' } },
  { id: 'chainlink-ccip', category: 'on-chain', name: 'Chainlink CCIP', tagline: 'Cross-chain',
    wired: 'soon', logo: { kind: 'wordmark', label: 'CL', tone: 'blue' } },
  { id: 'morpho', category: 'on-chain', name: 'Morpho', tagline: 'DeFi collateral',
    wired: 'soon', logo: { kind: 'wordmark', label: 'M', tone: 'blue' } },

  // Market data
  { id: 'bloomberg', category: 'market-data', name: 'Bloomberg', tagline: 'Market data',
    wired: 'soon', logo: { kind: 'wordmark', label: 'BB', tone: 'amber' } },
  { id: 'lseg', category: 'market-data', name: 'LSEG / Refinitiv', tagline: 'Market data',
    wired: 'soon', logo: { kind: 'wordmark', label: 'LSEG', tone: 'ink' } },
  { id: 'markit', category: 'market-data', name: 'Markit', tagline: 'Loan pricing',
    wired: 'soon', logo: { kind: 'icon', Icon: LineChart } },

  // Rating agency
  { id: 'moodys', category: 'rating-agency', name: "Moody's", tagline: 'Ratings',
    wired: 'soon', logo: { kind: 'wordmark', label: 'M', tone: 'red' } },
  { id: 'sp-global', category: 'rating-agency', name: 'S&P Global', tagline: 'Ratings',
    wired: 'soon', logo: { kind: 'wordmark', label: 'S&P', tone: 'red' } },
  { id: 'fitch', category: 'rating-agency', name: 'Fitch', tagline: 'Ratings',
    wired: 'soon', logo: { kind: 'icon', Icon: Award } },

  // Agent bank
  { id: 'alter-domus', category: 'agent-bank', name: 'Alter Domus', tagline: 'Loan agent',
    wired: 'soon', logo: { kind: 'icon', Icon: Landmark } },
  { id: 'apex-group', category: 'agent-bank', name: 'Apex Group', tagline: 'Fund services',
    wired: 'soon', logo: { kind: 'icon', Icon: Landmark } },

  // Analytics
  { id: 'rwa-xyz', category: 'analytics', name: 'RWA.xyz', tagline: 'On-chain analytics',
    wired: 'soon', logo: { kind: 'icon', Icon: Link2 } },
  { id: 'dune', category: 'analytics', name: 'Dune', tagline: 'On-chain SQL',
    wired: 'soon', logo: { kind: 'wordmark', label: 'D', tone: 'ink' } },

  // Custom
  { id: 'http-webhook', category: 'custom', name: 'HTTP webhook', tagline: 'Push endpoint',
    wired: 'soon', logo: { kind: 'icon', Icon: Database } },
  { id: 'rest-poller', category: 'custom', name: 'REST poller', tagline: 'Pull endpoint',
    wired: 'soon', logo: { kind: 'icon', Icon: Database } },
]

export function connectorById(id: string): ConnectorDefinition | undefined {
  return CATALOG.find((c) => c.id === id)
}

export function connectorsByCategory(category: ConnectorCategory): ConnectorDefinition[] {
  return CATALOG.filter((c) => c.category === category)
}

export const CATEGORY_ORDER: ConnectorCategory[] = [
  'fund-admin', 'regulator', 'storage', 'warehouse',
  'on-chain', 'market-data', 'rating-agency', 'agent-bank',
  'analytics', 'custom',
]
```

- [ ] **Step 2: Commit**

```bash
git add components/v2/features/sources/catalog-data.ts
git commit -m "feat(sources): connector catalog data

10 categories, ~30 connectors. SEC EDGAR / S3 / File upload are wired
in MVP; the rest carry a 'soon' flag. Each connector has a logo render
hint (wordmark or icon). connectorById/connectorsByCategory helpers."
```

---

### Task A3: Canvas fixtures (connections + datasets + vault refs)

**Files:**
- Create: `lib/api/fixtures/connector-canvas.ts`
- Modify: `lib/api/fixtures/index.ts`

- [ ] **Step 1: Build the fixture**

```ts
// lib/api/fixtures/connector-canvas.ts
import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const connectorConnections: ConnectorConnection[] = [
  {
    id: 'conn_sfs_apollo',
    connectorId: 'sfs',
    category: 'fund-admin',
    name: 'Securitize Fund Services',
    subtitle: 'NAV · fund admin',
    status: 'ok',
    lastSyncAt: ts(2),
    cadence: '5min poll',
    datasetIds: ['ds_nav_daily', 'ds_positions_snapshot', 'ds_flows_subscriptions'],
  },
  {
    id: 'conn_securitize_platform',
    connectorId: 'securitize-platform',
    category: 'fund-admin',
    name: 'Securitize Platform',
    subtitle: 'Transfer agent',
    status: 'ok',
    lastSyncAt: ts(5),
    cadence: 'event-driven',
    datasetIds: ['ds_holders_register', 'ds_cap_table_lots'],
  },
  {
    id: 'conn_sec_edgar',
    connectorId: 'sec-edgar',
    category: 'regulator',
    name: 'SEC EDGAR',
    subtitle: 'Regulator',
    status: 'ok',
    lastSyncAt: ts(60),
    cadence: 'continuous',
    datasetIds: ['ds_form_n_port', 'ds_form_n_csr', 'ds_xbrl_financials'],
  },
  {
    id: 'conn_acred_archive_s3',
    connectorId: 's3',
    category: 'storage',
    name: 'acred-archive',
    subtitle: 'S3 bucket · borrower packets',
    status: 'attention',
    lastSyncAt: ts(540),
    cadence: '1h poll',
    datasetIds: ['ds_borrower_packets_raw', 'ds_covenant_attestations'],
    credentialsExpireAt: new Date(Date.now() + 4 * 24 * 60 * 60_000).toISOString(),
  },
  {
    id: 'conn_wormhole',
    connectorId: 'wormhole',
    category: 'on-chain',
    name: 'Wormhole Bridge',
    subtitle: 'Cross-chain',
    status: 'ok',
    lastSyncAt: ts(0.6),
    cadence: 'event-driven',
    datasetIds: ['ds_bridge_transfers'],
  },
  {
    id: 'conn_pyth',
    connectorId: 'pyth',
    category: 'on-chain',
    name: 'Pyth Network',
    subtitle: 'Pull oracle',
    status: 'ok',
    lastSyncAt: ts(0.4),
    cadence: 'continuous',
    datasetIds: ['ds_price_feeds_usd'],
  },
]

export const connectionDatasets: ConnectionDataset[] = [
  { id: 'ds_nav_daily', connectionId: 'conn_sfs_apollo', name: 'nav.daily',
    rowCount: 38_400, rowUnit: 'rows', lastSyncAt: ts(2), vaultIds: ['vault_acred'] },
  { id: 'ds_positions_snapshot', connectionId: 'conn_sfs_apollo', name: 'positions.snapshot',
    rowCount: 412_000, rowUnit: 'rows', lastSyncAt: ts(2), vaultIds: ['vault_acred'] },
  { id: 'ds_flows_subscriptions', connectionId: 'conn_sfs_apollo', name: 'flows.subscriptions',
    rowCount: 2_100, rowUnit: 'rows', lastSyncAt: ts(2), vaultIds: ['vault_acred'] },
  { id: 'ds_holders_register', connectionId: 'conn_securitize_platform', name: 'holders.register',
    rowCount: 187, rowUnit: 'rows', lastSyncAt: ts(5), vaultIds: ['vault_acred'] },
  { id: 'ds_cap_table_lots', connectionId: 'conn_securitize_platform', name: 'cap_table.lots',
    rowCount: 893, rowUnit: 'rows', lastSyncAt: ts(5), vaultIds: ['vault_tvf'] },
  { id: 'ds_form_n_port', connectionId: 'conn_sec_edgar', name: 'form_n_port',
    rowCount: 284_000, rowUnit: 'filings', lastSyncAt: ts(60), vaultIds: ['vault_acred'] },
  { id: 'ds_form_n_csr', connectionId: 'conn_sec_edgar', name: 'form_n_csr',
    rowCount: 412_000, rowUnit: 'filings', lastSyncAt: ts(60), vaultIds: ['vault_acred'] },
  { id: 'ds_xbrl_financials', connectionId: 'conn_sec_edgar', name: 'xbrl.financials',
    rowCount: 2_300_000, rowUnit: 'tags', lastSyncAt: ts(60), vaultIds: ['vault_tvf'] },
  { id: 'ds_borrower_packets_raw', connectionId: 'conn_acred_archive_s3', name: 'borrower_packets.raw',
    rowCount: 187_000, rowUnit: 'objects', lastSyncAt: ts(540), vaultIds: ['vault_acred'] },
  { id: 'ds_covenant_attestations', connectionId: 'conn_acred_archive_s3', name: 'covenant_attestations',
    rowCount: 1_400, rowUnit: 'objects', lastSyncAt: ts(540), vaultIds: ['vault_acred'] },
  { id: 'ds_bridge_transfers', connectionId: 'conn_wormhole', name: 'bridge.transfers',
    rowCount: 3_400, rowUnit: 'events', lastSyncAt: ts(0.6), vaultIds: ['vault_tvf'] },
  { id: 'ds_price_feeds_usd', connectionId: 'conn_pyth', name: 'price_feeds.usd',
    rowCount: 8_200_000, rowUnit: 'ticks', lastSyncAt: ts(0.4), vaultIds: ['vault_tvf'] },
]

export const vaultRefs: VaultRef[] = [
  { id: 'vault_acred', symbol: 'ACRED', sponsor: 'Securitize · Apollo · production',
    palette: 'forest', datasetCount: 8, consumerCount: 3 },
  { id: 'vault_tvf', symbol: 'TVF', sponsor: 'Maple · TradFi Vintage Fund',
    palette: 'periwinkle', datasetCount: 4, consumerCount: 1 },
]

export const connectorCanvasFixtures = {
  connections: connectorConnections,
  datasets: connectionDatasets,
  vaults: vaultRefs,
}
```

- [ ] **Step 2: Wire into fixtures index**

Open `lib/api/fixtures/index.ts`. Add this import alongside the others:

```ts
import { connectorCanvasFixtures } from './connector-canvas'
```

Then add to the `export const fixtures = { ... }` literal:

```ts
  connectorCanvas: connectorCanvasFixtures,
```

- [ ] **Step 3: Commit**

```bash
git add lib/api/fixtures/connector-canvas.ts lib/api/fixtures/index.ts
git commit -m "feat(sources): canvas fixtures — connections, datasets, vault refs

Six connections (SFS, Securitize Platform, SEC EDGAR, S3, Wormhole,
Pyth) feeding twelve datasets into two vaults (ACRED, TVF). Includes
one 'attention' state on the S3 connection with credentials expiring
in 4 days, matching the spec's edge cases."
```

---

## Phase B · Layout engine (TDD)

### Task B1: `use-canvas-layout` — pure layout calculator with tests

**Files:**
- Create: `components/v2/features/sources/hooks/use-canvas-layout.ts`
- Create: `tests/unit/sources/use-canvas-layout.test.ts`

Layout output schema:

```ts
export type CanvasItem =
  | { kind: 'source-tile'; id: string; x: number; y: number; w: number; h: number; categoryLabel?: string }
  | { kind: 'dataset-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'vault-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'category-label'; id: string; x: number; y: number; label: string }

export type CanvasEdge =
  | { kind: 'source-to-dataset'; from: string; to: string; status: 'ok' | 'attention' | 'error' | 'paused' }
  | { kind: 'dataset-to-vault'; from: string; to: string; status: 'ok' | 'attention' | 'error' | 'paused' }

export type CanvasLayout = {
  items: CanvasItem[]
  edges: CanvasEdge[]
  width: number
  height: number
}
```

Algorithm (constants in code):
- Three lanes left-to-right at x = 36 (sources), x = 380 (datasets), x = 720 (vaults). Canvas width = 920.
- Sources tile size: 260 × 50. Vertical gap between tiles within a category: 8px. Between category groups: 36px (with a 16px-tall category kicker label above the first tile).
- Dataset tile size: 175 × 36. Datasets are placed top-down adjacent to their parent source: the *vertical center* of the dataset block matches the parent source tile's vertical center; datasets stack with 6px gap.
- Vault tile size: 175 × 80. Vaults stack vertically; their y is the average y of their consumed datasets (clipped within canvas height).
- Categories are emitted in CATEGORY_ORDER; if no connections in a category, skip.

- [ ] **Step 1: Write failing tests**

```ts
// tests/unit/sources/use-canvas-layout.test.ts
import { describe, expect, it } from 'vitest'
import { computeCanvasLayout } from '@/components/v2/features/sources/hooks/use-canvas-layout'
import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

const t = '2026-05-21T10:00:00.000Z'

function fxOneConnection(): { connections: ConnectorConnection[]; datasets: ConnectionDataset[]; vaults: VaultRef[] } {
  return {
    connections: [{
      id: 'c1', connectorId: 'sec-edgar', category: 'regulator', name: 'SEC EDGAR',
      status: 'ok', lastSyncAt: t, cadence: 'continuous', datasetIds: ['d1'],
    }],
    datasets: [{
      id: 'd1', connectionId: 'c1', name: 'form_n_port', rowCount: 1, rowUnit: 'filings',
      lastSyncAt: t, vaultIds: ['v1'],
    }],
    vaults: [{ id: 'v1', symbol: 'ACRED', sponsor: 'Apollo', palette: 'forest', datasetCount: 1, consumerCount: 0 }],
  }
}

describe('computeCanvasLayout', () => {
  it('places a single source tile in the regulator lane with a category label above it', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)

    const label = layout.items.find((i) => i.kind === 'category-label')
    expect(label).toBeDefined()
    expect(label?.label).toBe('Regulator')
    expect(label?.x).toBe(36)

    const src = layout.items.find((i) => i.kind === 'source-tile' && i.id === 'c1')
    expect(src).toBeDefined()
    expect(src?.x).toBe(36)
    expect(src?.w).toBe(260)
    expect(src?.h).toBe(50)
    expect(src?.y).toBeGreaterThan(label!.y) // tile is below its category label
  })

  it('places the dataset adjacent (vertically centered) to its parent source', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    const src = layout.items.find((i) => i.kind === 'source-tile')!
    const ds = layout.items.find((i) => i.kind === 'dataset-tile' && i.id === 'd1')!
    expect(ds.x).toBe(380)
    // Centers align within 4px
    expect(Math.abs((src.y + src.h / 2) - (ds.y + ds.h / 2))).toBeLessThan(4)
  })

  it('places the vault tile near the average y of its consumed datasets', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    const ds = layout.items.find((i) => i.kind === 'dataset-tile')!
    const vault = layout.items.find((i) => i.kind === 'vault-tile' && i.id === 'v1')!
    expect(vault.x).toBe(720)
    expect(vault.w).toBe(175)
    expect(vault.h).toBe(80)
    expect(Math.abs(vault.y - ds.y)).toBeLessThan(80)
  })

  it('emits one source-to-dataset edge and one dataset-to-vault edge with status propagated', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    expect(layout.edges).toHaveLength(2)
    expect(layout.edges[0]).toMatchObject({ kind: 'source-to-dataset', from: 'c1', to: 'd1', status: 'ok' })
    expect(layout.edges[1]).toMatchObject({ kind: 'dataset-to-vault', from: 'd1', to: 'v1', status: 'ok' })
  })

  it('orders categories per CATEGORY_ORDER and skips empty categories', () => {
    const f = fxOneConnection()
    // Add a fund-admin connection — should appear ABOVE the regulator one in the output
    f.connections.unshift({
      id: 'c0', connectorId: 'sfs', category: 'fund-admin', name: 'SFS',
      status: 'ok', lastSyncAt: t, cadence: '5min poll', datasetIds: [],
    })
    const layout = computeCanvasLayout(f)
    const labels = layout.items.filter((i) => i.kind === 'category-label')
    expect(labels.map((l) => l.label)).toEqual(['Fund admin', 'Regulator'])
    expect(labels[0].y).toBeLessThan(labels[1].y)
  })

  it('propagates attention status to source-to-dataset edge', () => {
    const f = fxOneConnection()
    f.connections[0].status = 'attention'
    const layout = computeCanvasLayout(f)
    expect(layout.edges[0].status).toBe('attention')
  })

  it('returns a width of 920 and a height that grows with content', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    expect(layout.width).toBe(920)
    expect(layout.height).toBeGreaterThanOrEqual(200)
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/sources/use-canvas-layout.test.ts
```

Expected: FAIL with "Cannot find module '@/components/v2/features/sources/hooks/use-canvas-layout'"

- [ ] **Step 3: Implement layout**

```ts
// components/v2/features/sources/hooks/use-canvas-layout.ts
import { useMemo } from 'react'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '@/components/v2/features/sources/catalog-data'
import type {
  ConnectorConnection,
  ConnectionDataset,
  ConnectorCategory,
  VaultRef,
} from '@/lib/api/schemas'

export type CanvasItem =
  | { kind: 'source-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'dataset-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'vault-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'category-label'; id: string; x: number; y: number; label: string }

export type CanvasEdge =
  | { kind: 'source-to-dataset'; from: string; to: string; status: ConnectorConnection['status'] }
  | { kind: 'dataset-to-vault'; from: string; to: string; status: ConnectorConnection['status'] }

export type CanvasLayout = {
  items: CanvasItem[]
  edges: CanvasEdge[]
  width: number
  height: number
}

export type LayoutInput = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  vaults: readonly VaultRef[]
}

const CANVAS_WIDTH = 920
const LANE_SOURCE_X = 36
const LANE_DATASET_X = 380
const LANE_VAULT_X = 720
const SOURCE_W = 260, SOURCE_H = 50
const DATASET_W = 175, DATASET_H = 36
const VAULT_W = 175, VAULT_H = 80
const CATEGORY_TOP_PADDING = 36
const CATEGORY_LABEL_HEIGHT = 20
const TILE_GAP_WITHIN_CATEGORY = 8
const DATASET_GAP = 6
const CANVAS_TOP_PADDING = 44

export function computeCanvasLayout(input: LayoutInput): CanvasLayout {
  const { connections, datasets, vaults } = input
  const items: CanvasItem[] = []
  const edges: CanvasEdge[] = []

  // Group connections by category
  const byCategory = new Map<ConnectorCategory, ConnectorConnection[]>()
  for (const c of connections) {
    const existing = byCategory.get(c.category) ?? []
    existing.push(c)
    byCategory.set(c.category, existing)
  }

  // Maintain a map of source-id → y center (after placement) for dataset alignment
  const sourceCenters = new Map<string, number>()

  // Place sources lane top-down
  let y = CANVAS_TOP_PADDING
  for (const cat of CATEGORY_ORDER) {
    const conns = byCategory.get(cat)
    if (!conns || conns.length === 0) continue
    // Sort by name asc
    const sorted = [...conns].sort((a, b) => a.name.localeCompare(b.name))

    // Category label
    items.push({
      kind: 'category-label',
      id: `cat-${cat}`,
      x: LANE_SOURCE_X,
      y,
      label: CATEGORY_LABELS[cat],
    })
    y += CATEGORY_LABEL_HEIGHT

    for (const c of sorted) {
      items.push({
        kind: 'source-tile',
        id: c.id,
        x: LANE_SOURCE_X,
        y,
        w: SOURCE_W,
        h: SOURCE_H,
      })
      sourceCenters.set(c.id, y + SOURCE_H / 2)
      y += SOURCE_H + TILE_GAP_WITHIN_CATEGORY
    }

    y += CATEGORY_TOP_PADDING - TILE_GAP_WITHIN_CATEGORY
  }

  // Place datasets adjacent to their parent source
  for (const c of connections) {
    const center = sourceCenters.get(c.id)
    if (center === undefined) continue
    const myDatasets = datasets.filter((d) => d.connectionId === c.id)
    if (myDatasets.length === 0) continue
    const stackHeight = myDatasets.length * DATASET_H + (myDatasets.length - 1) * DATASET_GAP
    let dy = center - stackHeight / 2
    for (const d of myDatasets) {
      items.push({
        kind: 'dataset-tile',
        id: d.id,
        x: LANE_DATASET_X,
        y: dy,
        w: DATASET_W,
        h: DATASET_H,
      })
      edges.push({ kind: 'source-to-dataset', from: c.id, to: d.id, status: c.status })
      dy += DATASET_H + DATASET_GAP
    }
  }

  // Place vaults: y = average y of consumed datasets
  const datasetItemById = new Map(
    items.filter((i) => i.kind === 'dataset-tile').map((i) => [i.id, i] as const),
  )
  for (const v of vaults) {
    const consumed = datasets.filter((d) => d.vaultIds.includes(v.id))
    const centers: number[] = []
    for (const d of consumed) {
      const item = datasetItemById.get(d.id)
      if (item) centers.push(item.y + item.h / 2)
    }
    const avgCenter = centers.length > 0 ? centers.reduce((a, b) => a + b, 0) / centers.length : CANVAS_TOP_PADDING + VAULT_H
    const vy = Math.max(CANVAS_TOP_PADDING, avgCenter - VAULT_H / 2)
    items.push({ kind: 'vault-tile', id: v.id, x: LANE_VAULT_X, y: vy, w: VAULT_W, h: VAULT_H })

    // Edges: every dataset that feeds this vault, with the propagated status of its source
    for (const d of consumed) {
      const sourceConn = connections.find((c) => c.id === d.connectionId)
      edges.push({
        kind: 'dataset-to-vault',
        from: d.id,
        to: v.id,
        status: sourceConn?.status ?? 'ok',
      })
    }
  }

  // Compute height
  const maxItemBottom = items.reduce((m, i) => {
    const bottom = 'h' in i ? i.y + i.h : i.y + CATEGORY_LABEL_HEIGHT
    return Math.max(m, bottom)
  }, 0)
  const height = Math.max(200, maxItemBottom + 40)

  return { items, edges, width: CANVAS_WIDTH, height }
}

export function useCanvasLayout(input: LayoutInput): CanvasLayout {
  return useMemo(() => computeCanvasLayout(input), [input])
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/sources/use-canvas-layout.test.ts
```

Expected: PASS — all 7 tests.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/sources/hooks/use-canvas-layout.ts tests/unit/sources/use-canvas-layout.test.ts
git commit -m "feat(sources): use-canvas-layout — pure auto-layout algorithm

Computes positioned items (tiles + category labels) and edges from
connections / datasets / vaults. Three lanes (source / dataset /
vault). Datasets center-aligned to their parent source; vaults
center-aligned to their consumed datasets. Deterministic, no
user-stored layout state. 7 unit tests cover lane placement, ordering,
status propagation, and dimensions."
```

---

## Phase C · Canvas at rest (UI; route through hyve-driven-development)

> **Every UI task in this phase must be dispatched via `hyve-driven-development`.** That routes to `ui-component-dev` for implementation and triggers the mandatory `ui-design-reviewer` + `accessibility-auditor` reviewers after the change. The implementer must run `pnpm dev` and visually verify the page in Playwright MCP per the project's `visual-fix` discipline. Type-check + lint + dev-server screenshot ARE the test gates for UI components in this repo.

### Task C1: Route skeleton + page header

**Files:**
- Create: `app/(originator)/sources/page.tsx` (REPLACE the existing stub)
- Create: `app/(originator)/sources/loading.tsx`
- Create: `app/(originator)/sources/error.tsx`

- [ ] **Step 1: Replace page.tsx**

```tsx
// app/(originator)/sources/page.tsx
import { fixtures } from '@/lib/api/fixtures'
import { SourcesCanvas } from '@/components/v2/features/sources'

export const metadata = {
  title: 'Connections — Hyve',
}

export default function SourcesPage() {
  const { connections, datasets, vaults } = fixtures.connectorCanvas
  return (
    <SourcesCanvas
      connections={connections}
      datasets={datasets}
      vaults={vaults}
    />
  )
}
```

- [ ] **Step 2: Add loading + error states**

```tsx
// app/(originator)/sources/loading.tsx
export default function Loading() {
  return (
    <div className="px-8 pt-6">
      <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
        {'// pipeline · sources'}
      </p>
      <div className="mt-2 h-8 w-48 animate-pulse rounded bg-v2-foreground/[0.06]" />
      <div className="mt-2 h-4 w-96 animate-pulse rounded bg-v2-foreground/[0.04]" />
    </div>
  )
}
```

```tsx
// app/(originator)/sources/error.tsx
'use client'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-8 pt-6">
      <h1 className="text-xl font-semibold text-v2-foreground">Connections couldn't load</h1>
      <p className="mt-2 text-sm text-v2-muted">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md border border-v2-border px-3 py-1.5 text-sm text-v2-foreground hover:bg-v2-foreground/[0.05]"
      >
        Try again
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create the canvas component stub + index**

```tsx
// components/v2/features/sources/sources-canvas.tsx
'use client'

import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  vaults: readonly VaultRef[]
}

export function SourcesCanvas({ connections, datasets, vaults }: Props) {
  return (
    <div className="px-8 pt-6 pb-12">
      <header className="flex items-end justify-between gap-6 border-b border-v2-border/60 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
            {'// pipeline · sources'}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-v2-foreground">
            Connections
          </h1>
          <p className="mt-1 max-w-prose text-sm text-v2-muted">
            {connections.length} sources feeding {datasets.length} datasets into {vaults.length} data vaults.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-v2-foreground px-4 py-2 text-sm font-medium text-v2-background hover:bg-v2-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          + Add connector
        </button>
      </header>
      {/* Canvas appears below — added in Task C5 */}
      <div className="mt-8 text-xs text-v2-muted">Canvas pending — items rendered in Task C5.</div>
    </div>
  )
}
```

```ts
// components/v2/features/sources/index.ts
export { SourcesCanvas } from './sources-canvas'
```

- [ ] **Step 4: Verify page loads**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/sources`. Confirm:
- Header reads "Connections" with the kicker `// pipeline · sources`
- Body text says "6 sources feeding 12 datasets into 2 data vaults."
- "+ Add connector" button visible at the top-right
- Type-check passes: `pnpm typecheck`

- [ ] **Step 5: Commit**

```bash
git add app/\(originator\)/sources/ components/v2/features/sources/
git commit -m "feat(sources): /sources route + header + canvas component shell

Server-rendered route fetches connections/datasets/vaults fixtures and
hands them to the SourcesCanvas client component. Header carries the
existing v2 kicker pattern + an 'Add connector' CTA. Canvas body is
a placeholder until tile components land."
```

---

### Task C2: Source tile (compact)

**Files:**
- Create: `components/v2/features/sources/source-tile.tsx`

- [ ] **Step 1: Write the tile**

```tsx
// components/v2/features/sources/source-tile.tsx
'use client'

import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from './catalog-data'
import type { ConnectorConnection } from '@/lib/api/schemas'

const STATUS_CLASS: Record<ConnectorConnection['status'], string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

const STATUS_LABEL: Record<ConnectorConnection['status'], string> = {
  ok: 'healthy',
  attention: 'attention',
  error: 'error',
  paused: 'paused',
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

type Props = {
  connection: ConnectorConnection
  datasetCount: number
  selected?: boolean
  onSelect?: () => void
}

export function SourceTile({ connection, datasetCount, selected, onSelect }: Props) {
  const def = connectorById(connection.connectorId)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${connection.name} — ${STATUS_LABEL[connection.status]}, ${datasetCount} datasets, synced ${fmtRelative(connection.lastSyncAt)}`}
      className={cn(
        'group flex h-full w-full items-center gap-3 rounded-[10px] border bg-v2-surface px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        selected
          ? 'border-v2-foreground/40 shadow-sm'
          : 'border-v2-border hover:border-v2-foreground/30',
      )}
    >
      <Logo def={def} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">
          {connection.name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-v2-muted">
          <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', STATUS_CLASS[connection.status])} />
          <span className="truncate">
            {datasetCount} dataset{datasetCount === 1 ? '' : 's'} · synced {fmtRelative(connection.lastSyncAt)}
          </span>
        </div>
      </div>
    </button>
  )
}

function Logo({ def }: { def: ReturnType<typeof connectorById> }) {
  if (!def) {
    return <div className="size-7 rounded-md bg-v2-surface-2" aria-hidden="true" />
  }
  if (def.logo.kind === 'wordmark') {
    const length = def.logo.label.length
    const textSize =
      length <= 1 ? 'text-sm' : length <= 2 ? 'text-xs' : length <= 3 ? 'text-[11px]' : 'text-[10px]'
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex size-7 items-center justify-center rounded-md font-mono font-semibold tracking-tight',
          WORDMARK_TONES[def.logo.tone],
          textSize,
        )}
      >
        {def.logo.label}
      </span>
    )
  }
  const Icon = def.logo.Icon
  return (
    <span className="flex size-7 items-center justify-center rounded-md border border-v2-border bg-v2-surface">
      <Icon className="size-4 text-v2-muted" strokeWidth={1.6} aria-hidden="true" />
    </span>
  )
}
```

- [ ] **Step 2: Type-check passes**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/sources/source-tile.tsx
git commit -m "feat(sources): SourceTile compact tile

Hairline-bordered tile, wordmark/icon logo, name + status dot + last-
sync subtitle. Status dots use OKLCH-tinted backgrounds matching the
existing v2 palette. ARIA label encodes name + status + datasets +
freshness for screen readers."
```

---

### Task C3: Dataset tile (compact)

**Files:**
- Create: `components/v2/features/sources/dataset-tile.tsx`

- [ ] **Step 1: Write the tile**

```tsx
// components/v2/features/sources/dataset-tile.tsx
'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ConnectionDataset } from '@/lib/api/schemas'

function fmtCount(n: number, unit: ConnectionDataset['rowUnit']): string {
  let formatted: string
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    formatted = (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + 'M'
  } else if (n >= 1_000) {
    formatted = Math.round(n / 1_000) + 'K'
  } else {
    formatted = String(n)
  }
  return `${formatted} ${unit}`
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s`
  if (diff < 3600) return `${Math.round(diff / 60)}m`
  if (diff < 86400) return `${Math.round(diff / 3600)}h`
  return `${Math.round(diff / 86400)}d`
}

type Props = {
  dataset: ConnectionDataset
}

export function DatasetTile({ dataset }: Props) {
  return (
    <Link
      href={`/datasets/${dataset.id}`}
      aria-label={`Dataset ${dataset.name} — ${fmtCount(dataset.rowCount, dataset.rowUnit)}, updated ${fmtRelative(dataset.lastSyncAt)} ago`}
      className={cn(
        'group flex h-full w-full items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-2.5 py-1.5 transition-colors',
        'hover:border-v2-foreground/25',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-3.5 items-center justify-center rounded-[3px] border border-v2-border bg-v2-surface-2"
      >
        <span className="size-1.5 rounded-[1px] bg-v2-muted/70" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] font-medium text-v2-foreground">{dataset.name}</div>
        <div className="truncate text-[9.5px] text-v2-muted">
          {fmtCount(dataset.rowCount, dataset.rowUnit)} · {fmtRelative(dataset.lastSyncAt)}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Type-check passes**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/sources/dataset-tile.tsx
git commit -m "feat(sources): DatasetTile compact tile

Smaller-format tile for the dataset lane. Glyph + name + row-count
+ freshness. Tiles link to /datasets/[id] so the operator can drill
through from the canvas."
```

---

### Task C4: Vault peripheral tile

**Files:**
- Create: `components/v2/features/sources/vault-peripheral-tile.tsx`

- [ ] **Step 1: Write the tile**

```tsx
// components/v2/features/sources/vault-peripheral-tile.tsx
'use client'

import Link from 'next/link'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import { cn } from '@/lib/utils'
import type { VaultRef } from '@/lib/api/schemas'

type Props = {
  vault: VaultRef
}

export function VaultPeripheralTile({ vault }: Props) {
  const palette = getPaletteEntry(vault.palette)
  const hex = palette?.hex ?? 'var(--v2-muted)'
  return (
    <Link
      href={`/vaults/${vault.id}`}
      aria-label={`Vault ${vault.symbol} — ${vault.sponsor}, ${vault.datasetCount} datasets, ${vault.consumerCount} consumers`}
      className={cn(
        'group flex h-full w-full flex-col justify-between rounded-xl border border-v2-border bg-v2-surface px-3.5 py-2.5 transition-colors',
        'hover:border-v2-foreground/30',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: hex }} />
          <span className="text-[13px] font-semibold tracking-tight text-v2-foreground">{vault.symbol}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-[10.5px] text-v2-muted">{vault.sponsor}</p>
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-v2-muted">
        <span>
          <span className="font-mono tabular-nums text-v2-foreground">{vault.datasetCount}</span> datasets
        </span>
        <span>
          <span className="font-mono tabular-nums text-v2-foreground">{vault.consumerCount}</span> consumers
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Type-check passes**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/sources/vault-peripheral-tile.tsx
git commit -m "feat(sources): VaultPeripheralTile

Right-lane peripheral tile. Links to /vaults/[id]. Re-uses the v2
palette swatch from origination components."
```

---

### Task C5: Wire the canvas — render lanes from the layout

**Files:**
- Modify: `components/v2/features/sources/sources-canvas.tsx`
- Create: `components/v2/features/sources/category-lane.tsx`

- [ ] **Step 1: Add CategoryLabel atom**

```tsx
// components/v2/features/sources/category-lane.tsx
'use client'

export function CategoryLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <div
      className="absolute text-[9.5px] font-medium uppercase tracking-[0.14em] text-v2-muted/65"
      style={{ left: x, top: y }}
    >
      {label}
    </div>
  )
}
```

- [ ] **Step 2: Replace sources-canvas.tsx**

```tsx
// components/v2/features/sources/sources-canvas.tsx
'use client'

import { useReducer } from 'react'
import { useCanvasLayout } from './hooks/use-canvas-layout'
import { SourceTile } from './source-tile'
import { DatasetTile } from './dataset-tile'
import { VaultPeripheralTile } from './vault-peripheral-tile'
import { CategoryLabel } from './category-lane'
import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

type CanvasState = { selectedTileId: string | null }
type CanvasAction = { type: 'select'; id: string } | { type: 'deselect' }

function reducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedTileId: action.id }
    case 'deselect':
      return { ...state, selectedTileId: null }
  }
}

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  vaults: readonly VaultRef[]
}

export function SourcesCanvas({ connections, datasets, vaults }: Props) {
  const layout = useCanvasLayout({ connections, datasets, vaults })
  const [state, dispatch] = useReducer(reducer, { selectedTileId: null })

  const connectionById = new Map(connections.map((c) => [c.id, c]))
  const datasetById = new Map(datasets.map((d) => [d.id, d]))
  const vaultById = new Map(vaults.map((v) => [v.id, v]))
  const datasetCountByConn = new Map<string, number>()
  for (const d of datasets) {
    datasetCountByConn.set(d.connectionId, (datasetCountByConn.get(d.connectionId) ?? 0) + 1)
  }

  return (
    <div className="px-8 pt-6 pb-12">
      <header className="flex items-end justify-between gap-6 border-b border-v2-border/60 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
            {'// pipeline · sources'}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-v2-foreground">
            Connections
          </h1>
          <p className="mt-1 max-w-prose text-sm text-v2-muted">
            {connections.length} sources feeding {datasets.length} datasets into {vaults.length} data vaults.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-v2-foreground px-4 py-2 text-sm font-medium text-v2-background hover:bg-v2-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          + Add connector
        </button>
      </header>

      {/* Canvas */}
      <div
        className="relative mt-6 overflow-hidden rounded-2xl border border-v2-border/60 bg-v2-surface/40"
        style={{ height: layout.height, width: '100%' }}
        aria-label="Connections canvas"
        role="region"
        onClick={(e) => {
          if (e.target === e.currentTarget) dispatch({ type: 'deselect' })
        }}
      >
        {/* Dotted background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--v2-foreground) 7%, transparent) 1px, transparent 1.5px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Items */}
        {layout.items.map((item) => {
          if (item.kind === 'category-label') {
            return <CategoryLabel key={item.id} x={item.x} y={item.y} label={item.label} />
          }
          const style = { left: item.x, top: item.y, width: item.w, height: item.h }
          if (item.kind === 'source-tile') {
            const conn = connectionById.get(item.id)
            if (!conn) return null
            return (
              <div key={item.id} className="absolute" style={style}>
                <SourceTile
                  connection={conn}
                  datasetCount={datasetCountByConn.get(conn.id) ?? 0}
                  selected={state.selectedTileId === conn.id}
                  onSelect={() => dispatch({ type: 'select', id: conn.id })}
                />
              </div>
            )
          }
          if (item.kind === 'dataset-tile') {
            const ds = datasetById.get(item.id)
            if (!ds) return null
            return (
              <div key={item.id} className="absolute" style={style}>
                <DatasetTile dataset={ds} />
              </div>
            )
          }
          if (item.kind === 'vault-tile') {
            const v = vaultById.get(item.id)
            if (!v) return null
            return (
              <div key={item.id} className="absolute" style={style}>
                <VaultPeripheralTile vault={v} />
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run dev server and verify rendering visually**

```bash
pnpm dev
```

Navigate to `http://localhost:3000/sources`. Use Playwright MCP screenshot at desktop width (>= 1440). Verify:
- Three lanes visible: 6 source tiles on the left (in 4 category groups), 12 dataset tiles in the middle, 2 vault tiles on the right
- Category labels above their tile groups
- Tiles do not overlap
- Status dots visible on source tiles
- The page scrolls cleanly with the canvas inside

Hand the screenshot to `ui-design-reviewer`. Iterate until VERIFIED per the project's visual-fix discipline.

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): render the canvas — three lanes from layout output

Wires SourceTile, DatasetTile, VaultPeripheralTile + CategoryLabel
through computeCanvasLayout. Absolute positioning per the layout
output. Dotted background subtly textures the canvas without
competing with tiles. Click an empty area to deselect."
```

---

### Task C6: SVG edge layer

**Files:**
- Create: `components/v2/features/sources/canvas-edges.tsx`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Write the edge layer**

```tsx
// components/v2/features/sources/canvas-edges.tsx
'use client'

import { useMemo } from 'react'
import type { CanvasEdge, CanvasItem } from './hooks/use-canvas-layout'

const EDGE_GUTTER = 30  // horizontal "C" curve gutter

type Props = {
  edges: readonly CanvasEdge[]
  items: readonly CanvasItem[]
  width: number
  height: number
  highlightedTileId?: string | null
}

export function CanvasEdges({ edges, items, width, height, highlightedTileId }: Props) {
  const paths = useMemo(() => {
    const itemById = new Map<string, CanvasItem>()
    for (const i of items) itemById.set(i.id, i)
    return edges.flatMap((edge, idx) => {
      const from = itemById.get(edge.from)
      const to = itemById.get(edge.to)
      if (!from || !to || !('w' in from) || !('w' in to)) return []
      const x1 = from.x + from.w
      const y1 = from.y + from.h / 2
      const x2 = to.x
      const y2 = to.y + to.h / 2
      const c1x = x1 + EDGE_GUTTER
      const c2x = x2 - EDGE_GUTTER
      const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`
      const highlighted =
        highlightedTileId === edge.from || highlightedTileId === edge.to
      const stroke =
        edge.status === 'attention' || edge.status === 'error'
          ? 'url(#edge-warn)'
          : 'url(#edge-base)'
      return [{
        key: `${edge.kind}-${edge.from}-${edge.to}-${idx}`,
        d,
        stroke,
        opacity: highlighted ? 1 : (highlightedTileId ? 0.25 : 1),
        strokeWidth: highlighted ? 1.5 : 1,
      }]
    })
  }, [edges, items, highlightedTileId])

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="edge-base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--v2-muted)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--v2-muted)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--v2-muted)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="edge-warn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="oklch(0.70 0.14 70)" stopOpacity="0" />
          <stop offset="0.5" stopColor="oklch(0.70 0.14 70)" stopOpacity="0.6" />
          <stop offset="1" stopColor="oklch(0.70 0.14 70)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill="none"
          opacity={p.opacity}
          style={{ transition: 'opacity 180ms, stroke-width 180ms' }}
        />
      ))}
    </svg>
  )
}
```

- [ ] **Step 2: Render edges inside the canvas**

In `sources-canvas.tsx`, import `CanvasEdges` and render it right after the dotted-background div, BEFORE the items:

```tsx
import { CanvasEdges } from './canvas-edges'
// ...
<CanvasEdges
  edges={layout.edges}
  items={layout.items}
  width={layout.width}
  height={layout.height}
  highlightedTileId={state.selectedTileId}
/>
```

- [ ] **Step 3: Verify visually with Playwright**

`pnpm dev`, navigate to `/sources`, take a screenshot. Verify:
- Hairline curved edges connect each source → datasets, and each dataset → vaults
- S3 (acred-archive) edges are amber/warning color
- Selecting a source tile dims all unrelated edges to ~25% and slightly thickens connected edges

Iterate with `ui-design-reviewer` until VERIFIED.

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): hairline SVG edge layer

Cubic curves from source-tile right edge to dataset-tile left edge,
then dataset-tile right to vault-tile left. Gradient strokes fade in
the middle so edges read as hints, not lines. attention/error edges
use the amber gradient. Selecting a tile dims unrelated edges to 25%."
```

---

### Task C7: Floating action bar + legend

**Files:**
- Create: `components/v2/features/sources/floating-action-bar.tsx`
- Create: `components/v2/features/sources/legend.tsx`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Floating action bar**

```tsx
// components/v2/features/sources/floating-action-bar.tsx
'use client'

import { cn } from '@/lib/utils'

type Props = {
  onAddClick: () => void
  onFindClick: () => void
}

export function FloatingActionBar({ onAddClick, onFindClick }: Props) {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
        'flex items-center gap-1 rounded-full border border-v2-border bg-v2-surface/95 p-1 shadow-md shadow-black/[0.06] backdrop-blur',
      )}
    >
      <button
        type="button"
        onClick={onAddClick}
        className="rounded-full bg-v2-foreground px-3 py-1.5 text-[12px] font-medium text-v2-background hover:bg-v2-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
      >
        + Add connector
      </button>
      <button
        type="button"
        onClick={onFindClick}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] text-v2-muted transition-colors hover:bg-v2-foreground/[0.05] hover:text-v2-foreground"
      >
        <span>Find</span>
        <kbd className="rounded border border-v2-border/80 px-1 text-[9px] font-mono text-v2-muted">⌘K</kbd>
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Legend**

```tsx
// components/v2/features/sources/legend.tsx
'use client'

export function Legend() {
  return (
    <div className="absolute bottom-4 right-4 z-10 flex items-center gap-3 rounded-md border border-v2-border/60 bg-v2-surface/95 px-2 py-1 text-[10px] text-v2-muted/80 backdrop-blur">
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.55_0.10_150)]" /> healthy
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.70_0.14_70)]" /> attention
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-[oklch(0.55_0.18_25)]" /> error
      </span>
      <span className="flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-v2-muted/60" /> paused
      </span>
    </div>
  )
}
```

- [ ] **Step 3: Render inside canvas**

In `sources-canvas.tsx`, after the items map (still inside the canvas div), add:

```tsx
<FloatingActionBar
  onAddClick={() => { /* wired in Task D1 */ }}
  onFindClick={() => { /* wired in Task D1 */ }}
/>
<Legend />
```

Add the imports.

- [ ] **Step 4: Verify visually with Playwright**

`pnpm dev`, take screenshot. Confirm the floating bar sits bottom-center inside the canvas; the legend sits bottom-right. Both have backdrop-blur and hairline borders. Iterate with `ui-design-reviewer`.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): floating action bar + legend

Bottom-center pill carries '+ Add connector' (primary) and '⌘K Find'.
Bottom-right legend documents the four status colors. Both have
hairline borders, backdrop-blur, no shadow chrome."
```

---

### Task C8: Empty state

**Files:**
- Create: `components/v2/features/sources/empty-state.tsx`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Write the empty state**

```tsx
// components/v2/features/sources/empty-state.tsx
'use client'

import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from './catalog-data'

const QUICK_PICKS = ['sfs', 's3', 'sec-edgar', 'file-upload'] as const

type Props = {
  onPick: (connectorId: string) => void
  onBrowse: () => void
}

export function EmptyState({ onPick, onBrowse }: Props) {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-v2-foreground">Connect your first data source</h2>
        <p className="mt-1 text-sm text-v2-muted">Pick one to get started, or browse the catalog.</p>
      </div>
      <div className="flex gap-2">
        {QUICK_PICKS.map((id) => {
          const def = connectorById(id)
          if (!def) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-sm text-v2-foreground transition-colors',
                'hover:border-v2-foreground/30',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
              )}
            >
              {def.logo.kind === 'wordmark' ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 items-center justify-center rounded font-mono text-[10px] font-semibold',
                    WORDMARK_TONES[def.logo.tone],
                  )}
                >
                  {def.logo.label}
                </span>
              ) : null}
              <span>{def.name}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="text-[12px] text-v2-muted underline-offset-2 hover:text-v2-foreground hover:underline"
      >
        Browse the catalog →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Branch in the canvas**

At the top of `SourcesCanvas`, after deriving layout, replace the canvas inner block with a conditional:

```tsx
const isEmpty = connections.length === 0
// ...
{isEmpty ? (
  <EmptyState
    onPick={(id) => { /* wired in Task F4 */ }}
    onBrowse={() => { /* wired in Task D1 */ }}
  />
) : (
  /* existing canvas items + edges */
)}
```

- [ ] **Step 3: Verify visually**

To test the empty state without removing fixtures, temporarily edit `app/(originator)/sources/page.tsx` to pass an empty array, take a screenshot, then revert. Iterate with `ui-design-reviewer`.

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): empty state — quick picks + catalog hint

When zero connections exist, show four quick-pick connector buttons
(SFS, S3, SEC EDGAR, File upload) plus a 'Browse the catalog' link."
```

---

## Phase D · Catalog sheet

### Task D1: Catalog bottom sheet — open/close, categories, connector cards

**Files:**
- Create: `components/v2/features/sources/catalog-sheet.tsx`
- Create: `components/v2/features/sources/hooks/use-catalog-sheet.ts`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Hook**

```ts
// components/v2/features/sources/hooks/use-catalog-sheet.ts
'use client'

import { useCallback, useEffect, useState } from 'react'

export function useCatalogSheet() {
  const [open, setOpen] = useState(false)
  const openSheet = useCallback(() => setOpen(true), [])
  const closeSheet = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return { open, openSheet, closeSheet }
}
```

- [ ] **Step 2: Catalog sheet**

```tsx
// components/v2/features/sources/catalog-sheet.tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CATALOG,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  WORDMARK_TONES,
  type ConnectorDefinition,
} from './catalog-data'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (connectorId: string) => void
}

export function CatalogSheet({ open, onClose, onPick }: Props) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-v2-background/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Add a connector"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-hidden rounded-t-3xl border-t border-v2-border bg-v2-surface shadow-2xl shadow-black/20"
          >
            <header className="flex items-end justify-between gap-4 border-b border-v2-border/60 px-6 pb-4 pt-5">
              <div>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-v2-muted/65">// catalog</p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-v2-foreground">
                  Pick a connector
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md px-2 py-1 text-xs text-v2-muted hover:text-v2-foreground"
                aria-label="Close catalog"
              >
                Esc
              </button>
            </header>

            <nav className="flex gap-1 overflow-x-auto border-b border-v2-border/40 px-6 py-2" aria-label="Categories">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-[12px] transition-colors',
                    activeCategory === cat
                      ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                      : 'text-v2-muted hover:text-v2-foreground',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </nav>

            <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(55vh - 130px)' }}>
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {CATALOG.filter((c) => c.category === activeCategory).map((c) => (
                  <CatalogCard key={c.id} def={c} onPick={() => { if (c.wired === 'wired') onPick(c.id) }} />
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

function CatalogCard({ def, onPick }: { def: ConnectorDefinition; onPick: () => void }) {
  const disabled = def.wired === 'soon'
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        aria-label={disabled ? `${def.name} — coming soon` : `Connect ${def.name}`}
        className={cn(
          'group flex h-full w-full items-center gap-2.5 rounded-lg border border-v2-border bg-v2-surface px-3 py-2.5 text-left transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-v2-foreground/30 hover:bg-v2-foreground/[0.03]',
        )}
      >
        {def.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 items-center justify-center rounded-md font-mono text-[11px] font-semibold',
              WORDMARK_TONES[def.logo.tone],
            )}
          >
            {def.logo.label}
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-md border border-v2-border bg-v2-surface">
            <def.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.6} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">{def.name}</span>
            {disabled ? (
              <span className="font-mono text-[9px] uppercase tracking-wider text-v2-muted/70">Soon</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[10.5px] text-v2-muted">{def.tagline}</p>
        </div>
      </button>
    </li>
  )
}
```

- [ ] **Step 3: Wire into canvas**

In `sources-canvas.tsx`:

```tsx
import { CatalogSheet } from './catalog-sheet'
import { useCatalogSheet } from './hooks/use-catalog-sheet'

// inside SourcesCanvas:
const { open: catalogOpen, openSheet, closeSheet } = useCatalogSheet()

// inside the canvas div, after FloatingActionBar:
<CatalogSheet
  open={catalogOpen}
  onClose={closeSheet}
  onPick={(id) => {
    closeSheet()
    // Setup flow wires this in Task F4
    console.info('catalog pick (stub):', id)
  }}
/>
```

Wire the FloatingActionBar:
```tsx
<FloatingActionBar onAddClick={openSheet} onFindClick={openSheet} />
```

Also wire the header's "+ Add connector" button to call `openSheet`.

- [ ] **Step 4: Verify visually**

Run dev server, click "+ Add connector" — the sheet slides up. Press Escape — it slides down. Press ⌘K — toggles. Click outside the sheet — closes. Click "SEC EDGAR" — currently just logs to console; that's fine for this task.

Iterate with `ui-design-reviewer` and `accessibility-auditor` (focus trap, ARIA roles, keyboard).

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): catalog bottom sheet + ⌘K shortcut

55vh sheet slides up over a 55%-opacity scrim. Categories as horizontal
tabs; a grid of connector cards beneath. 'Soon' connectors are visible
but disabled. ⌘K / Esc toggles. onPick currently logs; setup flow is
wired in Phase F."
```

---

## Phase E · Inspector (existing connections)

### Task E1: Expanded tile shell + inspector content

**Files:**
- Create: `components/v2/features/sources/source-tile-expanded.tsx`
- Create: `components/v2/features/sources/inspector/inspector-content.tsx`
- Create: `components/v2/features/sources/inspector/actions-row.tsx`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Inspector content**

```tsx
// components/v2/features/sources/inspector/inspector-content.tsx
'use client'

import Link from 'next/link'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function fmtRowCount(n: number, unit: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M ${unit}`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ${unit}`
  return `${n} ${unit}`
}

type Props = {
  connection: ConnectorConnection
  datasets: readonly ConnectionDataset[]
}

export function InspectorContent({ connection, datasets }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">Health</h3>
        <p className="mt-1 text-[12.5px] text-v2-foreground">
          Connected · {datasets.length} dataset{datasets.length === 1 ? '' : 's'} · synced{' '}
          {fmtRelative(connection.lastSyncAt)} · cadence: {connection.cadence}
        </p>
        {connection.credentialsExpireAt ? (
          <p className="mt-1 text-[11.5px] text-[oklch(0.55_0.14_70)]">
            Credentials expire {fmtRelative(connection.credentialsExpireAt)}
          </p>
        ) : null}
        {connection.errorMessage ? (
          <p className="mt-1 text-[11.5px] text-[oklch(0.55_0.18_25)]">{connection.errorMessage}</p>
        ) : null}
      </section>

      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">Datasets</h3>
        <ul className="mt-1.5 grid gap-1">
          {datasets.map((d) => (
            <li key={d.id}>
              <Link
                href={`/datasets/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12px] text-v2-foreground transition-colors hover:bg-v2-foreground/[0.04]"
              >
                <span className="font-medium">{d.name}</span>
                <span className="font-mono text-[10.5px] tabular-nums text-v2-muted">
                  {fmtRowCount(d.rowCount, d.rowUnit)} · {fmtRelative(d.lastSyncAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Actions row**

```tsx
// components/v2/features/sources/inspector/actions-row.tsx
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ConnectorConnection } from '@/lib/api/schemas'
import { pauseConnection, resumeConnection } from '@/app/(originator)/sources/actions'

type Props = {
  connection: ConnectorConnection
  onReconnect: () => void
  onRequestRemove: () => void
}

export function ActionsRow({ connection, onReconnect, onRequestRemove }: Props) {
  const [pending, startTransition] = useTransition()
  const paused = connection.status === 'paused'

  function togglePause() {
    startTransition(async () => {
      const action = paused ? resumeConnection : pauseConnection
      const result = await action(connection.id)
      if (result.ok) {
        toast.success(paused ? 'Resumed' : 'Paused')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex gap-2 pt-1">
      <Btn onClick={togglePause} disabled={pending}>{paused ? 'Resume' : 'Pause'}</Btn>
      <Btn onClick={onReconnect}>Reconnect</Btn>
      <Btn onClick={onRequestRemove} tone="danger">Remove</Btn>
    </div>
  )
}

function Btn({ children, onClick, disabled, tone }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: 'danger' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md border px-2.5 py-1 text-[11.5px] transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        tone === 'danger'
          ? 'border-v2-border text-[oklch(0.55_0.18_25)] hover:bg-[oklch(0.55_0.18_25)]/[0.06]'
          : 'border-v2-border text-v2-foreground hover:bg-v2-foreground/[0.04]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 3: Expanded tile shell**

```tsx
// components/v2/features/sources/source-tile-expanded.tsx
'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from './catalog-data'
import { InspectorContent } from './inspector/inspector-content'
import { ActionsRow } from './inspector/actions-row'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

const STATUS_DOT: Record<ConnectorConnection['status'], string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

type Props = {
  connection: ConnectorConnection
  datasets: readonly ConnectionDataset[]
  onClose: () => void
  /** Setup mode is wired in Phase F. For inspector, omit. */
  mode?: 'inspect'
}

export function SourceTileExpanded({ connection, datasets, onClose }: Props) {
  const def = connectorById(connection.connectorId)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-v2-foreground/30 bg-v2-surface p-4 shadow-xl shadow-black/[0.08]"
    >
      <header className="flex items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          {def?.logo.kind === 'wordmark' ? (
            <span aria-hidden="true" className={cn('flex size-8 items-center justify-center rounded-md font-mono text-[11px] font-semibold', WORDMARK_TONES[def.logo.tone])}>{def.logo.label}</span>
          ) : null}
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-v2-foreground">{connection.name}</h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-v2-muted">
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', STATUS_DOT[connection.status])} />
              <span>{connection.subtitle ?? def?.tagline}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded-md p-1 text-v2-muted hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </header>

      {confirmingRemove ? (
        <RemoveConfirm
          connection={connection}
          onCancel={() => setConfirmingRemove(false)}
          onRemoved={onClose}
        />
      ) : (
        <>
          <InspectorContent connection={connection} datasets={datasets} />
          <ActionsRow
            connection={connection}
            onReconnect={() => { /* wired in Phase F */ }}
            onRequestRemove={() => setConfirmingRemove(true)}
          />
        </>
      )}
    </motion.div>
  )
}

function RemoveConfirm({ connection, onCancel, onRemoved }: { connection: ConnectorConnection; onCancel: () => void; onRemoved: () => void }) {
  const [value, setValue] = useState('')
  const match = value.trim() === connection.name
  return (
    <div className="rounded-md border border-v2-border/80 bg-v2-surface-2/50 p-3">
      <p className="text-[12.5px] text-v2-foreground">Remove {connection.name}?</p>
      <p className="mt-1 text-[11px] text-v2-muted">Datasets and their bindings will be dropped. Type the connection name to confirm.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={connection.name}
        className="mt-2 w-full rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12px] text-v2-foreground placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
        aria-label="Connection name to confirm removal"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border px-2.5 py-1 text-[11.5px] text-v2-foreground hover:bg-v2-foreground/[0.04]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!match}
          onClick={async () => {
            const { removeConnection } = await import('@/app/(originator)/sources/actions')
            const result = await removeConnection(connection.id, value)
            const { toast } = await import('sonner')
            if (result.ok) {
              toast.success('Removed')
              onRemoved()
            } else {
              toast.error(result.error)
            }
          }}
          className={cn(
            'rounded-md border px-2.5 py-1 text-[11.5px]',
            match
              ? 'border-[oklch(0.55_0.18_25)] bg-[oklch(0.55_0.18_25)] text-v2-background'
              : 'cursor-not-allowed border-v2-border text-v2-muted',
          )}
        >
          Remove
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Render expanded tile in canvas when selected**

In `sources-canvas.tsx`, when `state.selectedTileId` matches a source id, render the expanded card overlaying the canvas at the source-tile position, sized 480×360 (or computed). For MVP, render it inline in place of the source tile:

```tsx
// In the source-tile rendering branch:
if (item.kind === 'source-tile') {
  const conn = connectionById.get(item.id)
  if (!conn) return null
  const isSelected = state.selectedTileId === conn.id
  if (isSelected) {
    return (
      <div
        key={item.id}
        className="absolute z-20"
        style={{ left: item.x, top: item.y, width: 480 }}
      >
        <SourceTileExpanded
          connection={conn}
          datasets={datasets.filter((d) => d.connectionId === conn.id)}
          onClose={() => dispatch({ type: 'deselect' })}
        />
      </div>
    )
  }
  return (
    <div key={item.id} className="absolute" style={{ left: item.x, top: item.y, width: item.w, height: item.h }}>
      <SourceTile connection={conn} datasetCount={datasetCountByConn.get(conn.id) ?? 0} selected={false} onSelect={() => dispatch({ type: 'select', id: conn.id })} />
    </div>
  )
}
```

Add Escape-key support in the reducer hook:

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dispatch({ type: 'deselect' }) }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

- [ ] **Step 5: Verify visually**

`pnpm dev`. Click an SFS tile — expansion animates open. Click X — collapses. Press Esc — collapses. Try the Pause action (will fail until Task E2 lands; for now it should toast an error). Try Remove → type the name → button enables. Iterate with `ui-design-reviewer`.

- [ ] **Step 6: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): expanded tile shell + inspector content + actions

Clicking a source tile expands it in place into a 480px-wide card
with three sections (health, datasets, actions). Remove requires
typing the connection name. Resume/Pause toggles via a server action
(stubbed until Task E2). Escape collapses."
```

---

### Task E2: Server actions — pause / resume / remove

**Files:**
- Create: `app/(originator)/sources/actions.ts`

- [ ] **Step 1: Write actions**

```ts
// app/(originator)/sources/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const IdInput = z.object({ id: z.string().min(1) })

type ActionResult<T = void> = { ok: true; data?: T } | { ok: false; error: string }

export async function pauseConnection(id: string): Promise<ActionResult> {
  const parsed = IdInput.safeParse({ id })
  if (!parsed.success) return { ok: false, error: 'Invalid id' }
  // Fixture-based: no persistence layer in MVP. The toast is the affordance.
  revalidatePath('/sources')
  return { ok: true }
}

export async function resumeConnection(id: string): Promise<ActionResult> {
  const parsed = IdInput.safeParse({ id })
  if (!parsed.success) return { ok: false, error: 'Invalid id' }
  revalidatePath('/sources')
  return { ok: true }
}

const RemoveInput = z.object({ id: z.string().min(1), confirmName: z.string().min(1) })

export async function removeConnection(id: string, confirmName: string): Promise<ActionResult> {
  const parsed = RemoveInput.safeParse({ id, confirmName })
  if (!parsed.success) return { ok: false, error: 'Confirmation name required' }
  revalidatePath('/sources')
  return { ok: true }
}

const CreateInput = z.object({
  connectorId: z.string().min(1),
  name: z.string().min(2).max(80),
  // auth payload is connector-specific; serialized as JSON
  authPayload: z.record(z.unknown()).default({}),
  datasetIds: z.array(z.string()).default([]),
})

export async function createConnection(input: z.infer<typeof CreateInput>): Promise<ActionResult<{ id: string }>> {
  const parsed = CreateInput.safeParse(input)
  if (!parsed.success) return { ok: false, error: parsed.error.message }
  const id = `conn_${parsed.data.connectorId}_${Math.random().toString(36).slice(2, 8)}`
  revalidatePath('/sources')
  return { ok: true, data: { id } }
}
```

- [ ] **Step 2: Type-check passes**

```bash
pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add app/\(originator\)/sources/actions.ts
git commit -m "feat(sources): server actions — pause, resume, remove, create

Stub-level persistence (fixtures only) but full Zod validation, error
returns, and revalidatePath wiring so the UI plumbing is correct from
day one. createConnection generates a synthetic id."
```

---

## Phase F · Setup flow

### Task F1: Setup reducer (TDD)

**Files:**
- Create: `components/v2/features/sources/setup/setup-reducer.ts`
- Create: `tests/unit/sources/setup-reducer.test.ts`

State machine:

```
idle → auth (on start)
auth → discovering (on submitAuth)
discovering → select (on discoveryComplete)
select → submitting (on submitSelect)
submitting → done (on saveSuccess) | error (on saveFailure)
error → auth (on retry)
* → idle (on reset)
```

- [ ] **Step 1: Failing tests**

```ts
// tests/unit/sources/setup-reducer.test.ts
import { describe, expect, it } from 'vitest'
import { setupReducer, initialSetup, type SetupState } from '@/components/v2/features/sources/setup/setup-reducer'

describe('setupReducer', () => {
  it('starts at idle', () => {
    expect(initialSetup.step).toBe('idle')
  })

  it("'start' moves to auth with the connectorId", () => {
    const s = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    expect(s.step).toBe('auth')
    expect(s.connectorId).toBe('s3')
    expect(s.authPayload).toEqual({})
  })

  it("'updateAuth' merges fields into authPayload while in auth step", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
    const c = setupReducer(b, { type: 'updateAuth', patch: { region: 'us-east-1' } })
    expect(c.authPayload).toEqual({ bucket: 'acme', region: 'us-east-1' })
  })

  it("'submitAuth' moves to discovering", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'updateAuth', patch: { bucket: 'acme' } })
    const c = setupReducer(b, { type: 'submitAuth' })
    expect(c.step).toBe('discovering')
  })

  it("'discoveryComplete' moves to select with discovered datasets all selected", () => {
    const a: SetupState = { step: 'discovering', connectorId: 's3', authPayload: { bucket: 'acme' }, discovered: [], selectedIds: [] }
    const b = setupReducer(a, { type: 'discoveryComplete', discovered: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] })
    expect(b.step).toBe('select')
    expect(b.discovered).toHaveLength(2)
    expect(b.selectedIds).toEqual(['a', 'b'])
  })

  it("'toggleDataset' adds or removes a discovered id", () => {
    const a: SetupState = { step: 'select', connectorId: 's3', authPayload: {}, discovered: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], selectedIds: ['a', 'b'] }
    const b = setupReducer(a, { type: 'toggleDataset', id: 'a' })
    expect(b.selectedIds).toEqual(['b'])
    const c = setupReducer(b, { type: 'toggleDataset', id: 'a' })
    expect(c.selectedIds).toEqual(['b', 'a'])
  })

  it("'reset' returns to idle", () => {
    const a = setupReducer(initialSetup, { type: 'start', connectorId: 's3' })
    const b = setupReducer(a, { type: 'reset' })
    expect(b.step).toBe('idle')
  })

  it("'saveFailure' moves to error and stores the message", () => {
    const a: SetupState = { step: 'submitting', connectorId: 's3', authPayload: {}, discovered: [], selectedIds: [] }
    const b = setupReducer(a, { type: 'saveFailure', error: 'boom' })
    expect(b.step).toBe('error')
    expect(b.error).toBe('boom')
  })

  it("'retry' from error returns to auth keeping the payload", () => {
    const a: SetupState = { step: 'error', connectorId: 's3', authPayload: { bucket: 'acme' }, discovered: [], selectedIds: [], error: 'boom' }
    const b = setupReducer(a, { type: 'retry' })
    expect(b.step).toBe('auth')
    expect(b.authPayload).toEqual({ bucket: 'acme' })
  })
})
```

- [ ] **Step 2: Run tests to verify failure**

```bash
pnpm test tests/unit/sources/setup-reducer.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement reducer**

```ts
// components/v2/features/sources/setup/setup-reducer.ts
export type DiscoveredDataset = { id: string; name: string; subtitle?: string; rowCount?: number; rowUnit?: string }

export type SetupState =
  | { step: 'idle' }
  | { step: 'auth'; connectorId: string; authPayload: Record<string, unknown> }
  | { step: 'discovering'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'select'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'submitting'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[] }
  | { step: 'done'; connectorId: string; connectionId: string }
  | { step: 'error'; connectorId: string; authPayload: Record<string, unknown>; discovered: DiscoveredDataset[]; selectedIds: string[]; error: string }

export type SetupAction =
  | { type: 'start'; connectorId: string }
  | { type: 'updateAuth'; patch: Record<string, unknown> }
  | { type: 'submitAuth' }
  | { type: 'discoveryComplete'; discovered: DiscoveredDataset[] }
  | { type: 'toggleDataset'; id: string }
  | { type: 'submitSelect' }
  | { type: 'saveSuccess'; connectionId: string }
  | { type: 'saveFailure'; error: string }
  | { type: 'retry' }
  | { type: 'reset' }

export const initialSetup: SetupState = { step: 'idle' }

export function setupReducer(state: SetupState, action: SetupAction): SetupState {
  switch (action.type) {
    case 'reset':
      return initialSetup
    case 'start':
      return { step: 'auth', connectorId: action.connectorId, authPayload: {} }
    case 'updateAuth':
      if (state.step !== 'auth') return state
      return { ...state, authPayload: { ...state.authPayload, ...action.patch } }
    case 'submitAuth':
      if (state.step !== 'auth') return state
      return { step: 'discovering', connectorId: state.connectorId, authPayload: state.authPayload, discovered: [], selectedIds: [] }
    case 'discoveryComplete':
      if (state.step !== 'discovering') return state
      return { step: 'select', connectorId: state.connectorId, authPayload: state.authPayload, discovered: action.discovered, selectedIds: action.discovered.map((d) => d.id) }
    case 'toggleDataset':
      if (state.step !== 'select') return state
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      }
    case 'submitSelect':
      if (state.step !== 'select') return state
      return { step: 'submitting', connectorId: state.connectorId, authPayload: state.authPayload, discovered: state.discovered, selectedIds: state.selectedIds }
    case 'saveSuccess':
      if (state.step !== 'submitting') return state
      return { step: 'done', connectorId: state.connectorId, connectionId: action.connectionId }
    case 'saveFailure':
      if (state.step !== 'submitting') return state
      return { step: 'error', connectorId: state.connectorId, authPayload: state.authPayload, discovered: state.discovered, selectedIds: state.selectedIds, error: action.error }
    case 'retry':
      if (state.step !== 'error') return state
      return { step: 'auth', connectorId: state.connectorId, authPayload: state.authPayload }
  }
}
```

- [ ] **Step 4: Run tests to verify pass**

```bash
pnpm test tests/unit/sources/setup-reducer.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/sources/setup/setup-reducer.ts tests/unit/sources/setup-reducer.test.ts
git commit -m "feat(sources): setup reducer — auth → discover → select → save

State machine for the setup flow. Discriminated union by step.
toggleDataset acts only in 'select'; updateAuth only in 'auth'.
retry from error returns to auth keeping the payload. 9 unit tests
cover every transition."
```

---

### Task F2: Field schemas per connector

**Files:**
- Create: `components/v2/features/sources/setup/field-schemas.ts`

- [ ] **Step 1: Define schemas**

```ts
// components/v2/features/sources/setup/field-schemas.ts
import { z } from 'zod'

export type FieldHint = {
  key: string
  label: string
  type: 'text' | 'password' | 'select'
  placeholder?: string
  options?: readonly string[]
  helper?: string
}

export type ConnectorAuthSchema = {
  schema: z.ZodTypeAny
  fields: readonly FieldHint[]
}

export const S3_AUTH_SCHEMA: ConnectorAuthSchema = {
  schema: z.object({
    bucket: z.string().min(2),
    region: z.string().min(2),
    accessKeyId: z.string().min(8),
    secretAccessKey: z.string().min(8),
    prefix: z.string().optional(),
  }),
  fields: [
    { key: 'bucket', label: 'Bucket', type: 'text', placeholder: 'acred-archive' },
    { key: 'region', label: 'Region', type: 'select', options: ['us-east-1', 'us-east-2', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-2'] },
    { key: 'accessKeyId', label: 'Access key ID', type: 'text', placeholder: 'AKIA…' },
    { key: 'secretAccessKey', label: 'Secret access key', type: 'password' },
    { key: 'prefix', label: 'Prefix (optional)', type: 'text', placeholder: 'production/borrower-packets/', helper: 'Restrict ingestion to this prefix.' },
  ],
}

export const FILE_UPLOAD_AUTH_SCHEMA: ConnectorAuthSchema = {
  schema: z.object({
    label: z.string().min(2).max(60),
    format: z.enum(['csv', 'parquet', 'json']),
  }),
  fields: [
    { key: 'label', label: 'Dataset label', type: 'text', placeholder: 'q3-borrower-packets', helper: 'A human name for this drop.' },
    { key: 'format', label: 'File format', type: 'select', options: ['csv', 'parquet', 'json'] },
  ],
}

export const SEC_EDGAR_AUTH_SCHEMA: ConnectorAuthSchema = {
  schema: z.object({}),
  fields: [],
}

export function authSchemaFor(connectorId: string): ConnectorAuthSchema | null {
  switch (connectorId) {
    case 's3': return S3_AUTH_SCHEMA
    case 'file-upload': return FILE_UPLOAD_AUTH_SCHEMA
    case 'sec-edgar': return SEC_EDGAR_AUTH_SCHEMA
    default: return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add components/v2/features/sources/setup/field-schemas.ts
git commit -m "feat(sources): auth field schemas for S3, File upload, SEC EDGAR

Each connector exports a Zod schema + render hints (label, type,
placeholder, optional select options). authSchemaFor(id) returns the
appropriate schema or null for 'soon' connectors."
```

---

### Task F3: Auth, Discovery, Select steps

**Files:**
- Create: `components/v2/features/sources/setup/auth-step.tsx`
- Create: `components/v2/features/sources/setup/discovery-step.tsx`
- Create: `components/v2/features/sources/setup/select-step.tsx`

- [ ] **Step 1: AuthStep**

```tsx
// components/v2/features/sources/setup/auth-step.tsx
'use client'

import { cn } from '@/lib/utils'
import { authSchemaFor } from './field-schemas'

type Props = {
  connectorId: string
  values: Record<string, unknown>
  onUpdate: (patch: Record<string, unknown>) => void
  onSubmit: () => void
  onCancel: () => void
}

export function AuthStep({ connectorId, values, onUpdate, onSubmit, onCancel }: Props) {
  const schema = authSchemaFor(connectorId)
  if (!schema) return null

  // SEC EDGAR has no fields — skip auth straight through (handled by caller).
  if (schema.fields.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-v2-foreground">
          SEC EDGAR is a public dataset and needs no credentials. Continue to discover available forms.
        </p>
        <div className="flex justify-end gap-2 pt-1">
          <Btn onClick={onCancel} tone="secondary">Cancel</Btn>
          <Btn onClick={onSubmit}>Continue</Btn>
        </div>
      </div>
    )
  }

  const parseResult = schema.schema.safeParse(values)
  const valid = parseResult.success

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (valid) onSubmit() }}
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {schema.fields.map((f) => {
        const val = (values[f.key] as string) ?? ''
        const isFullWidth = f.type !== 'select' && (f.key === 'prefix' || f.key === 'label')
        return (
          <label key={f.key} className={cn('flex flex-col gap-1', isFullWidth && 'sm:col-span-2')}>
            <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">{f.label}</span>
            {f.type === 'select' ? (
              <select
                value={val}
                onChange={(e) => onUpdate({ [f.key]: e.target.value })}
                className="rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12.5px] text-v2-foreground focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
              >
                <option value="">Choose…</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                type={f.type === 'password' ? 'password' : 'text'}
                value={val}
                onChange={(e) => onUpdate({ [f.key]: e.target.value })}
                placeholder={f.placeholder}
                autoComplete="off"
                spellCheck={false}
                className="rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12.5px] text-v2-foreground placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
              />
            )}
            {f.helper ? <span className="text-[10px] text-v2-muted">{f.helper}</span> : null}
          </label>
        )
      })}
      <div className="flex justify-end gap-2 pt-1 sm:col-span-2">
        <Btn onClick={onCancel} tone="secondary" buttonType="button">Cancel</Btn>
        <Btn onClick={onSubmit} disabled={!valid} buttonType="submit">Continue</Btn>
      </div>
    </form>
  )
}

function Btn({ children, onClick, disabled, tone, buttonType }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; tone?: 'secondary'; buttonType?: 'submit' | 'button' }) {
  return (
    <button
      type={buttonType ?? 'button'}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md border px-3 py-1.5 text-[12px] transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        tone === 'secondary'
          ? 'border-v2-border text-v2-muted hover:text-v2-foreground'
          : disabled
            ? 'cursor-not-allowed border-v2-border bg-v2-surface-2 text-v2-muted'
            : 'border-v2-foreground bg-v2-foreground text-v2-background hover:bg-v2-foreground/90',
      )}
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: DiscoveryStep**

```tsx
// components/v2/features/sources/setup/discovery-step.tsx
'use client'

import { useEffect, useState } from 'react'
import { Check, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveredDataset } from './setup-reducer'

type DiscoveryProfile = {
  steps: { id: string; label: string; duration: number }[]
  result: DiscoveredDataset[]
}

const PROFILES: Record<string, DiscoveryProfile> = {
  's3': {
    steps: [
      { id: 'connect', label: 'Connecting to bucket', duration: 550 },
      { id: 'list', label: 'Listing prefixes', duration: 700 },
      { id: 'sample', label: 'Sampling schemas', duration: 850 },
      { id: 'count', label: 'Counting objects', duration: 600 },
    ],
    result: [
      { id: 'borrower_packets', name: 'borrower_packets', subtitle: 'PDFs · 187K objects', rowCount: 187_000, rowUnit: 'objects' },
      { id: 'covenant_attestations', name: 'covenant_attestations', subtitle: 'JSON · 1.4K objects', rowCount: 1_400, rowUnit: 'objects' },
    ],
  },
  'sec-edgar': {
    steps: [
      { id: 'connect', label: 'Connecting to EDGAR PDS', duration: 650 },
      { id: 'index', label: 'Indexing 12,847 registrants', duration: 700 },
      { id: 'resolve', label: 'Resolving series and class identifiers', duration: 500 },
      { id: 'count', label: 'Counting 4.7M filings across 8 forms', duration: 750 },
      { id: 'load', label: 'Loading dataset definitions', duration: 400 },
    ],
    result: [
      { id: 'form_n_port', name: 'Form N-PORT', subtitle: 'Monthly · 60d lag', rowCount: 284_567, rowUnit: 'filings' },
      { id: 'form_n_csr', name: 'Form N-CSR / N-CSRS', subtitle: 'Semi-annual', rowCount: 412_108, rowUnit: 'filings' },
      { id: 'form_n_cen', name: 'Form N-CEN', subtitle: 'Annual', rowCount: 97_433, rowUnit: 'filings' },
      { id: 'form_n_2', name: 'Form N-2', subtitle: 'Event-driven', rowCount: 8_421, rowUnit: 'filings' },
      { id: 'xbrl_financials', name: 'XBRL Financial Statements', subtitle: 'Continuous', rowCount: 2_341_067, rowUnit: 'tags' },
    ],
  },
  'file-upload': {
    steps: [
      { id: 'parse', label: 'Parsing file', duration: 600 },
      { id: 'infer', label: 'Inferring schema', duration: 700 },
    ],
    result: [
      { id: 'upload_default', name: 'Uploaded file', subtitle: 'Inferred schema', rowCount: 0, rowUnit: 'rows' },
    ],
  },
}

type Props = {
  connectorId: string
  onComplete: (discovered: DiscoveredDataset[]) => void
  onCancel: () => void
}

export function DiscoveryStep({ connectorId, onComplete, onCancel }: Props) {
  const profile = PROFILES[connectorId]
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (!profile) {
      onComplete([])
      return
    }
    if (activeIndex >= profile.steps.length) {
      const t = setTimeout(() => onComplete(profile.result), 320)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setActiveIndex((i) => i + 1), profile.steps[activeIndex].duration)
    return () => clearTimeout(t)
  }, [activeIndex, profile, onComplete])

  if (!profile) {
    return <p className="text-sm text-v2-muted">No discovery profile.</p>
  }

  const allDone = activeIndex >= profile.steps.length
  const progress = Math.min(activeIndex / profile.steps.length, 1)

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid gap-1.5">
        {profile.steps.map((s, i) => {
          const isDone = i < activeIndex || allDone
          const isActive = i === activeIndex && !allDone
          return (
            <li
              key={s.id}
              className={cn(
                'flex items-center gap-2 text-[12.5px] transition-colors',
                isDone || isActive ? 'text-v2-foreground' : 'text-v2-muted/45',
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isDone ? (
                  <Check className="size-3.5 text-v2-foreground" strokeWidth={2.5} />
                ) : isActive ? (
                  <Loader2 className="size-3.5 animate-spin text-v2-foreground" />
                ) : (
                  <Circle className="size-2.5 text-v2-muted/40" strokeWidth={1.5} />
                )}
              </span>
              <span>{s.label}</span>
            </li>
          )
        })}
      </ul>
      <div
        className="h-px w-full overflow-hidden bg-v2-border"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-px bg-v2-foreground transition-[width] duration-500 ease-out" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: SelectStep**

```tsx
// components/v2/features/sources/setup/select-step.tsx
'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveredDataset } from './setup-reducer'

type Props = {
  discovered: DiscoveredDataset[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  onConfirm: () => void
  onCancel: () => void
  submitting?: boolean
}

export function SelectStep({ discovered, selectedIds, onToggle, onToggleAll, onConfirm, onCancel, submitting }: Props) {
  const allSelected = selectedIds.length === discovered.length
  const noneSelected = selectedIds.length === 0
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <p className="text-[11px] text-v2-muted">
          <span className="font-medium text-v2-foreground">{selectedIds.length}</span> of {discovered.length} selected
        </p>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] text-v2-muted underline-offset-2 hover:text-v2-foreground hover:underline"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </header>
      <ul className="grid gap-1.5">
        {discovered.map((d) => {
          const checked = selectedIds.includes(d.id)
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onToggle(d.id)}
                aria-pressed={checked}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
                  checked ? 'border-v2-foreground/30 bg-v2-foreground/[0.03]' : 'border-v2-border hover:border-v2-foreground/20',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-v2-foreground">{d.name}</div>
                  {d.subtitle ? <div className="mt-0.5 truncate text-[10.5px] text-v2-muted">{d.subtitle}</div> : null}
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                    checked ? 'border-v2-foreground bg-v2-foreground text-v2-background' : 'border-v2-border bg-v2-surface',
                  )}
                >
                  {checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={noneSelected || submitting}
          className={cn(
            'rounded-md border px-3 py-1.5 text-[12px]',
            noneSelected || submitting
              ? 'cursor-not-allowed border-v2-border bg-v2-surface-2 text-v2-muted'
              : 'border-v2-foreground bg-v2-foreground text-v2-background hover:bg-v2-foreground/90',
          )}
        >
          {submitting
            ? 'Connecting…'
            : noneSelected
              ? 'Select datasets'
              : `Ingest ${selectedIds.length} dataset${selectedIds.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Type-check passes**

```bash
pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/sources/setup/
git commit -m "feat(sources): auth + discovery + select steps

Field-schema-driven auth form with per-connector profiles. Discovery
borrows the SEC EDGAR loading pattern (narrated steps with check/spin
glyphs). Select reuses the checkbox-card pattern with row-count and
subtitle. All keyboard-navigable, ARIA-correct."
```

---

### Task F4: Setup shell + wire into expanded tile

**Files:**
- Create: `components/v2/features/sources/setup/setup-shell.tsx`
- Modify: `components/v2/features/sources/source-tile-expanded.tsx`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Setup shell**

```tsx
// components/v2/features/sources/setup/setup-shell.tsx
'use client'

import { useReducer, useTransition } from 'react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { setupReducer, initialSetup, type SetupAction } from './setup-reducer'
import { AuthStep } from './auth-step'
import { DiscoveryStep } from './discovery-step'
import { SelectStep } from './select-step'
import { createConnection } from '@/app/(originator)/sources/actions'

const STEP_LABEL: Record<'auth' | 'discovering' | 'select' | 'submitting' | 'error', string> = {
  auth: 'Connect',
  discovering: 'Discover',
  select: 'Confirm',
  submitting: 'Saving',
  error: 'Error',
}

type Props = {
  connectorId: string
  onDone: (connectionId: string) => void
  onCancel: () => void
}

export function SetupShell({ connectorId, onDone, onCancel }: Props) {
  const [state, dispatch] = useReducer(setupReducer, { step: 'auth', connectorId, authPayload: {} })
  const [, startTransition] = useTransition()

  function submitSave(s: typeof state) {
    if (s.step !== 'select') return
    dispatch({ type: 'submitSelect' } satisfies SetupAction)
    startTransition(async () => {
      const result = await createConnection({
        connectorId,
        name: connectorNameFromAuth(connectorId, s.authPayload),
        authPayload: s.authPayload,
        datasetIds: s.selectedIds,
      })
      if (result.ok) {
        dispatch({ type: 'saveSuccess', connectionId: result.data!.id })
        toast.success('Connected')
        onDone(result.data!.id)
      } else {
        dispatch({ type: 'saveFailure', error: result.error })
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <StepStrip current={state.step} />

      <motion.div
        key={state.step}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="min-h-[160px]"
      >
        {state.step === 'auth' && (
          <AuthStep
            connectorId={connectorId}
            values={state.authPayload}
            onUpdate={(patch) => dispatch({ type: 'updateAuth', patch })}
            onSubmit={() => dispatch({ type: 'submitAuth' })}
            onCancel={onCancel}
          />
        )}
        {state.step === 'discovering' && (
          <DiscoveryStep
            connectorId={connectorId}
            onComplete={(discovered) => dispatch({ type: 'discoveryComplete', discovered })}
            onCancel={onCancel}
          />
        )}
        {(state.step === 'select' || state.step === 'submitting') && (
          <SelectStep
            discovered={state.discovered}
            selectedIds={state.selectedIds}
            onToggle={(id) => dispatch({ type: 'toggleDataset', id })}
            onToggleAll={() => {
              const allSelected = state.selectedIds.length === state.discovered.length
              for (const d of state.discovered) {
                // Toggle each that diverges from the desired side
                const present = state.selectedIds.includes(d.id)
                if (allSelected === present) dispatch({ type: 'toggleDataset', id: d.id })
              }
            }}
            onConfirm={() => submitSave(state)}
            onCancel={onCancel}
            submitting={state.step === 'submitting'}
          />
        )}
        {state.step === 'error' && (
          <div className="flex flex-col gap-3">
            <p className="text-[12.5px] text-[oklch(0.55_0.18_25)]">{state.error}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: 'retry' })}
                className="rounded-md border border-v2-foreground bg-v2-foreground px-3 py-1.5 text-[12px] text-v2-background hover:bg-v2-foreground/90"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

function connectorNameFromAuth(connectorId: string, authPayload: Record<string, unknown>): string {
  if (connectorId === 's3' && typeof authPayload.bucket === 'string') return authPayload.bucket
  if (connectorId === 'file-upload' && typeof authPayload.label === 'string') return authPayload.label
  return connectorId
}

function StepStrip({ current }: { current: keyof typeof STEP_LABEL | 'idle' | 'done' }) {
  const visible: Array<keyof typeof STEP_LABEL> = ['auth', 'discovering', 'select']
  return (
    <ol className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-v2-muted/65">
      {visible.map((s, i) => (
        <li key={s} className="flex items-center gap-2">
          <span className={cn('font-medium', s === current && 'text-v2-foreground')}>{STEP_LABEL[s]}</span>
          {i < visible.length - 1 && <span aria-hidden="true">·</span>}
        </li>
      ))}
    </ol>
  )
}
```

- [ ] **Step 2: Extend expanded tile to support setup mode**

In `source-tile-expanded.tsx`, change `Props` to accept either an existing connection (`mode: 'inspect'`) or a connectorId (`mode: 'setup'`):

```tsx
type Props =
  | { mode: 'inspect'; connection: ConnectorConnection; datasets: readonly ConnectionDataset[]; onClose: () => void }
  | { mode: 'setup'; connectorId: string; onClose: () => void; onDone: (connectionId: string) => void }

export function SourceTileExpanded(props: Props) {
  if (props.mode === 'inspect') {
    // existing implementation
  }
  // setup branch
  const def = connectorById(props.connectorId)
  return (
    <motion.div /* same outer styling */>
      <header className="flex items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          {/* logo */}
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-v2-foreground">Add {def?.name}</h2>
            <p className="mt-0.5 text-[10.5px] text-v2-muted">{def?.tagline}</p>
          </div>
        </div>
        <button type="button" onClick={props.onClose} aria-label="Cancel setup" className="rounded-md p-1 text-v2-muted hover:text-v2-foreground">
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </header>
      <SetupShell connectorId={props.connectorId} onCancel={props.onClose} onDone={props.onDone} />
    </motion.div>
  )
}
```

- [ ] **Step 3: Wire catalog → pending tile → setup in the canvas**

Add a `pendingConnectorId` state to the canvas using `useState` (it will be migrated to URL params in Task F5):

```tsx
const [pendingConnectorId, setPendingConnectorId] = useState<string | null>(null)
```

Update `CatalogSheet`'s `onPick` callback:

```tsx
onPick={(id) => {
  closeSheet()
  setPendingConnectorId(id)
}}
```

When `pendingConnectorId` is non-null, render a `SourceTileExpanded` in setup mode at the bottom of the source lane (centered horizontally over the source column at `x = 36, y = layout.height - 380, width = 480`):

```tsx
{pendingConnectorId ? (
  <div
    className="absolute z-30"
    style={{ left: 36, top: Math.max(60, layout.height - 380), width: 480 }}
  >
    <SourceTileExpanded
      mode="setup"
      connectorId={pendingConnectorId}
      onClose={() => setPendingConnectorId(null)}
      onDone={() => setPendingConnectorId(null)}
    />
  </div>
) : null}
```

Also wire the inspector's `onReconnect` callback (Task E1) to start a new setup for the same connector type:

```tsx
// In the inspect branch of SourceTileExpanded rendering:
<SourceTileExpanded
  mode="inspect"
  connection={conn}
  datasets={datasets.filter((d) => d.connectionId === conn.id)}
  onClose={() => dispatch({ type: 'deselect' })}
  onReconnect={() => {
    dispatch({ type: 'deselect' })
    setPendingConnectorId(conn.connectorId)
  }}
/>
```

Extend the inspect branch of `SourceTileExpanded` to accept and forward `onReconnect` — it was already wired through to `ActionsRow` in Task E1, now it has a non-empty implementation.

- [ ] **Step 4: Verify visually**

`pnpm dev`. Click "+ Add connector" → catalog opens → click "Amazon S3" → catalog closes, a pending setup tile appears on the canvas. Fill in the auth form, hit Continue, watch the narrated discovery, pick datasets, hit Ingest. Toast says "Connected." The tile disappears (we don't refetch in MVP).

Iterate with `ui-design-reviewer`, `accessibility-auditor`.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/sources/ app/\(originator\)/sources/
git commit -m "feat(sources): inline-on-canvas setup flow

Pick from catalog → pending tile materializes on canvas → tile
expands into a 3-step shell (Connect → Discover → Confirm) → save.
No modals at any point. Wired connectors: S3, SEC EDGAR, File upload.
Setup state lives in a useReducer; createConnection server action
gates the save."
```

---

### Task F5: URL-synced setup state

**Files:**
- Create: `components/v2/features/sources/hooks/use-setup-flow.ts`
- Modify: `components/v2/features/sources/sources-canvas.tsx`

- [ ] **Step 1: Hook**

```ts
// components/v2/features/sources/hooks/use-setup-flow.ts
'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useSetupFlow(): {
  pendingConnectorId: string | null
  start: (connectorId: string) => void
  end: () => void
} {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const pendingConnectorId = params.get('add')

  const start = useCallback(
    (connectorId: string) => {
      const next = new URLSearchParams(params)
      next.set('add', connectorId)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  const end = useCallback(() => {
    const next = new URLSearchParams(params)
    next.delete('add')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [params, pathname, router])

  return { pendingConnectorId, start, end }
}
```

- [ ] **Step 2: Replace canvas-local pending state with URL-backed state**

In `sources-canvas.tsx`, remove the `useState<string | null>(null)` for `pendingConnectorId`. Use `useSetupFlow()` instead:

```tsx
import { useSetupFlow } from './hooks/use-setup-flow'
// ...
const { pendingConnectorId, start: startSetup, end: endSetup } = useSetupFlow()
// ...
<CatalogSheet onPick={(id) => { closeSheet(); startSetup(id) }} ... />
// When rendering pending tile:
{pendingConnectorId ? (
  <div className="absolute z-30" style={{ left: 36, top: Math.max(60, layout.height - 380), width: 480 }}>
    <SourceTileExpanded mode="setup" connectorId={pendingConnectorId} onClose={endSetup} onDone={endSetup} />
  </div>
) : null}
```

Also update the inspector's `onReconnect` to call `startSetup(conn.connectorId)`.

- [ ] **Step 3: Verify**

`pnpm dev`. Navigate to `/sources?add=s3` → setup opens immediately. Refresh mid-flow → setup re-opens at step 1 (we don't persist the step within the flow, only that the flow is open). Close → URL params clear.

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/sources/
git commit -m "feat(sources): URL-synced setup state

The 'add=<connectorId>' query param drives the pending setup. Refresh
mid-flow re-opens setup. Closing the flow clears the param. Step-
within-flow is not URL-persisted (the auth payload would be sensitive)."
```

---

## Phase G · Polish

### Task G1: Accessibility pass

**Files:**
- Modify: throughout `components/v2/features/sources/`

- [ ] **Step 1: Keyboard navigation audit**

Run the page with no mouse. Walk through:
- Tab — moves through source tiles top→bottom, then datasets, then vaults, then floating bar
- Enter — opens inspector for focused source tile
- Esc — closes inspector / sheet
- ⌘K — opens catalog
- Inside catalog: Tab through category tabs and connector cards; Enter selects

Where Tab order is wrong, set explicit `tabIndex={0}` on the tile wrappers and verify in DevTools' accessibility tree.

- [ ] **Step 2: Screen-reader announcements**

Open VoiceOver / NVDA. Confirm:
- Each source tile announces "{name}, {status}, {N datasets}, synced {time}"
- Status dots are not the only signal — verify aria-labels include the status word
- Discovery progress announces step transitions (`aria-live="polite"` on the discovery step container)

Add a `aria-live="polite"` wrapper on `DiscoveryStep`:

```tsx
<div aria-live="polite" aria-atomic="false">{/* progress list */}</div>
```

- [ ] **Step 3: Reduced motion**

In DevTools, enable `prefers-reduced-motion: reduce`. Confirm:
- Tile expansion still happens but without scale animation
- Catalog sheet doesn't slide (cross-fades instead)
- Edge transitions are instant

framer-motion handles most of this, but verify by inspection. If any motion ignores the preference, add `useReducedMotion()` and short-circuit transitions.

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/sources/
git commit -m "fix(sources): a11y pass — tab order, aria-live, reduced motion

Explicit tabIndex on tile wrappers ensures predictable keyboard order.
DiscoveryStep wraps its progress list in aria-live='polite' so the
narrated checks are announced. Verified all motion respects
prefers-reduced-motion."
```

---

### Task G2: Visual polish + e2e smoke test

**Files:**
- Create: `tests/e2e/sources-canvas.spec.ts`

- [ ] **Step 1: Smoke test**

```ts
// tests/e2e/sources-canvas.spec.ts
import { expect, test } from '@playwright/test'

test.describe('/sources canvas', () => {
  test('renders 6 source tiles and 12 dataset tiles from fixtures', async ({ page }) => {
    await page.goto('/sources')
    await expect(page.getByRole('heading', { name: 'Connections' })).toBeVisible()
    // Source tiles
    await expect(page.getByRole('button', { name: /Securitize Fund Services/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /SEC EDGAR/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /acred-archive/ })).toBeVisible()
    // Dataset tiles (link to /datasets/[id])
    await expect(page.getByRole('link', { name: /nav.daily/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /form_n_port/ })).toBeVisible()
    // Vault peripheral tiles
    await expect(page.getByRole('link', { name: /ACRED/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /TVF/ })).toBeVisible()
  })

  test('opens the catalog sheet via the floating bar and closes via Esc', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Add connector/i }).first().click()
    await expect(page.getByRole('dialog', { name: /Add a connector/i })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: /Add a connector/i })).not.toBeVisible()
  })

  test('inspector expands a source tile and closes via Esc', async ({ page }) => {
    await page.goto('/sources')
    await page.getByRole('button', { name: /Securitize Fund Services/ }).click()
    await expect(page.getByRole('heading', { name: 'Securitize Fund Services' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('heading', { name: 'Securitize Fund Services' })).not.toBeVisible()
  })

  test('?add=s3 deep-link opens the S3 setup directly', async ({ page }) => {
    await page.goto('/sources?add=s3')
    await expect(page.getByRole('heading', { name: /Add Amazon S3/ })).toBeVisible()
  })
})
```

- [ ] **Step 2: Run E2E**

```bash
pnpm test:e2e tests/e2e/sources-canvas.spec.ts
```

Expected: PASS.

- [ ] **Step 3: Final visual review**

Run `pnpm dev`, take a fresh Playwright screenshot at desktop width. Hand to `ui-design-reviewer` for a final pass. Adjust any spacing / hover / focus polish that fails review.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/sources-canvas.spec.ts
git commit -m "test(sources): e2e smoke — canvas, catalog, inspector, deep-link

Four checks: tiles render from fixtures; catalog sheet opens via
floating-bar and closes via Esc; tile expansion + Esc collapse;
?add=s3 deep-link opens the S3 setup."
```

---

## Spec coverage check

| Spec section | Task(s) |
|---|---|
| Goal: replace modal source picker with canvas | C1–C7 |
| Three lanes left-to-right | C5 (rendering), B1 (layout output) |
| Auto-layout, no dragging | B1 |
| Hairline edges + status propagation | C6 |
| Tile anatomy (source / dataset / vault) | C2 / C3 / C4 |
| Floating action bar + legend | C7 |
| Setup interaction: catalog → pending → setup-shell → save | D1, F1–F4 |
| Heavy configs (2-column auth) | F3 (AuthStep with `isFullWidth` toggle) |
| Inspector for existing connections | E1 |
| Pause / Reconnect / Remove + inline remove-confirm | E1, E2 |
| Empty state with quick picks | C8 |
| Catalog content (10 categories) | A2 |
| File layout per spec | enforced by file paths in every task |
| Component boundaries (`SourcesCanvas` orchestrator ≤ ~150 LOC) | C5 + F4 (kept lean by extracting hooks) |
| Connection / Dataset / VaultRef schemas | A1 |
| Server actions (create / pause / resume / remove) | E2 |
| Animation specifics | C5 (rendering), E1 (expansion), D1 (sheet), F4 (step transitions) |
| Accessibility | G1 |
| Performance: edges single SVG, dynamic catalog import | C6 (SVG); D1 (consider `next/dynamic` if catalog grows) |
| Edge cases (cred-expiring, S3 attention) | A3 fixture, E1 inspector |
| URL-synced setup state | F5 |
| Out-of-scope (drag, pan/zoom, live pulse) | explicitly not implemented |

---

**Plan complete and saved to** `docs/superpowers/plans/2026-05-21-connector-view.md`.

Execution proceeds via **subagent-driven-development** — the user has asked for autonomous execution. Each task is dispatched to a fresh specialist agent through `hyve-driven-development`, with mandatory paired reviewers (`ui-design-reviewer`, `accessibility-auditor` for UI; `code-reviewer` for pure logic) firing after each change.
