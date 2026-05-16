/**
 * Counterparty (consumer) demo fixtures — Gauntlet (org_gauntlet) consuming
 * ACRED (Apollo Diversified Credit) and other vaults.
 *
 * Pure TypeScript types, no Zod. These are demo fixtures, not API responses.
 * Vocabulary: author / propose / approve / version / execute / sign / publish.
 * NEVER: subscribe / feed / stream / deliver / oracle / endpoint subscription.
 */

// ── Time helpers ──────────────────────────────────────────────────────────────

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

// ── Core types ────────────────────────────────────────────────────────────────

export type FieldTier = 'public' | 'tier_1' | 'tier_2' | 'tier_3'

export type VaultFieldType = 'NUMERIC' | 'TIMESTAMP' | 'TEXT' | 'BOOLEAN' | 'BYTES' | 'JSONB'

export type VaultField = {
  name: string
  type: VaultFieldType
  tier: FieldTier
  description: string
}

export type VaultFunction = {
  name: string
  signature: string
  description: string
  fields: VaultField[]
  cadence?: string
}

export type ChainId = 'ethereum' | 'base' | 'arbitrum' | 'optimism'

export type AnalysisStatus =
  | 'draft'
  | 'proposed'
  | 'changes_requested'
  | 'approved_executing'
  | 'denied'
  | 'retired'

export type ExecutionStatus = 'success' | 'partial' | 'failed'

export type Destination =
  | { kind: 'onchain'; chain: ChainId; address: string; label?: string }
  | { kind: 'http'; url: string; label?: string }

export type Trigger =
  | { kind: 'cron'; expr: string; humanized: string }
  | { kind: 'event'; sourceLabel: string }
  | { kind: 'manual' }

export type AnalysisVersion = {
  v: number
  status: 'draft' | 'proposed' | 'changes_requested' | 'executing' | 'denied' | 'retired'
  code: string
  proposedAt: string
  decidedAt?: string
  decision?: 'approved' | 'changes_requested' | 'denied'
  decisionNote?: string
  reviewer?: { name: string; org: string }
}

export type Analysis = {
  id: string
  name: string
  slug: string
  vaultId: string
  vaultLabel: string
  provider: { orgId: string; name: string }
  status: AnalysisStatus
  currentVersion: number
  versions: AnalysisVersion[]
  trigger: Trigger
  destinations: Destination[]
  lastExecutedAt?: string
  executionsToday: number
  executionsLast7d: number
}

export type Execution = {
  id: string
  analysisId: string
  analysisName: string
  version: number
  executedAt: string
  latencyMs: number
  status: ExecutionStatus
  payloadPreview: string
  payloadHash: string
  signature: string
  signingKeyFingerprint: string
  vaultSnapshotHash: string
  destinations: Array<
    | { kind: 'onchain'; chain: ChainId; txHash: string; blockNumber: number }
    | { kind: 'http'; url: string; statusCode: number; deliveredAt: string }
  >
}

export type ConsumerVault = {
  id: string
  name: string
  label: string
  provider: { orgId: string; name: string }
  myAccessLevel: 'read' | 'author'
  schemaCount: number
  myAnalysisCount: number
  grantedAt: string
  grantedBy: string
  lastProviderUpdateAt: string
  functions: VaultFunction[]
  accessibleTiers: FieldTier[]
}

// ── Analysis code snippets ────────────────────────────────────────────────────

const CODE_ADVANCE_RATE_V1 = `-- acred_advance_rate v1
WITH nav AS (
  SELECT current_nav, snapshot_at FROM vault.acred.nav_latest()
),
collateral AS (
  SELECT SUM(par_value) AS total_par
  FROM vault.acred.positions_snapshot()
  WHERE status = 'performing'
)
SELECT
  least(0.80, collateral.total_par * 0.90 / nav.current_nav) AS advance_rate,
  nav.snapshot_at AS as_of
FROM nav, collateral;`

const CODE_ADVANCE_RATE_V2 = `-- acred_advance_rate v2  (approved, executing)
WITH nav AS (
  SELECT current_nav, snapshot_at FROM vault.acred.nav_latest()
),
collateral AS (
  SELECT SUM(par_value) AS total_par
  FROM vault.acred.positions_snapshot()
  WHERE status = 'performing'
    AND asset_class IN ('senior_secured_loan', 'first_lien')
)
SELECT
  least(0.85, collateral.total_par * 0.95 / nav.current_nav) AS advance_rate,
  nav.current_nav                                             AS nav_usd,
  collateral.total_par                                        AS eligible_par,
  nav.snapshot_at                                             AS as_of
FROM nav, collateral;`

const CODE_ADVANCE_RATE_V3 = `-- acred_advance_rate v3  (proposed — pending provider review)
WITH nav AS (
  SELECT current_nav, snapshot_at FROM vault.acred.nav_latest()
),
collateral AS (
  SELECT
    asset_class,
    SUM(par_value) AS total_par
  FROM vault.acred.positions_snapshot()
  WHERE status = 'performing'
    AND asset_class IN ('senior_secured_loan', 'first_lien', 'second_lien')
  GROUP BY asset_class
),
eligible AS (
  SELECT
    SUM(CASE WHEN asset_class = 'second_lien' THEN total_par * 0.75
             ELSE total_par END) AS weighted_par
  FROM collateral
)
SELECT
  least(0.87, eligible.weighted_par * 0.95 / nav.current_nav) AS advance_rate,
  nav.current_nav                                              AS nav_usd,
  eligible.weighted_par                                        AS eligible_par,
  nav.snapshot_at                                              AS as_of
FROM nav, eligible;`

const CODE_NAV_FRESHNESS = `-- acred_nav_freshness  (approved, executing)
SELECT
  CASE
    WHEN extract(epoch FROM (now() - snapshot_at)) < 3600     THEN 'fresh'
    WHEN extract(epoch FROM (now() - snapshot_at)) < 86400    THEN 'stale'
    ELSE 'critical'
  END                                                         AS freshness,
  snapshot_at,
  extract(epoch FROM (now() - snapshot_at))::int              AS age_seconds,
  current_nav,
  nav_source
FROM vault.acred.nav_latest();`

const CODE_LTV_BAND_CAP = `-- acred_ltv_band_cap  (changes_requested — provider note below)
WITH nav AS (SELECT current_nav FROM vault.acred.nav_latest()),
loans AS (
  SELECT
    obligor_id,
    SUM(par_value) AS exposure,
    MAX(ltv_ratio)  AS max_ltv
  FROM vault.acred.positions_snapshot()
  WHERE status = 'performing'
  GROUP BY obligor_id
)
SELECT
  count(*) FILTER (WHERE max_ltv > 0.80) AS loans_over_80_ltv,
  count(*) FILTER (WHERE max_ltv > 0.70
                    AND max_ltv <= 0.80)  AS loans_70_to_80_ltv,
  count(*)                                AS total_loans
FROM loans;`

const CODE_CONCENTRATION_CHECK = `-- acred_concentration_check  (denied — see reason)
WITH nav AS (SELECT current_nav FROM vault.acred.nav_latest()),
positions AS (
  SELECT
    obligor_id,
    obligor_name,
    industry_code,
    SUM(par_value) AS total_par
  FROM vault.acred.positions_snapshot()
  WHERE status IN ('performing', 'watch')
  GROUP BY obligor_id, obligor_name, industry_code
)
SELECT
  p.obligor_name,
  p.industry_code,
  p.total_par,
  p.total_par / nav.current_nav AS pct_nav
FROM positions p, nav
ORDER BY p.total_par DESC;`

const CODE_REDEMPTION_EVENT = `-- acred_redemption_event  (event-triggered, approved, executing)
SELECT
  redemption_id,
  requested_at,
  investor_id,
  amount_usd,
  status,
  estimated_settlement_date
FROM vault.acred.redemption_queue()
WHERE status = 'pending'
  AND requested_at > now() - interval '24 hours'
ORDER BY requested_at DESC;`

const CODE_DSCR_CHECK = `-- acred_dscr_check  (draft — not yet proposed)
-- TODO: confirm vault.acred.cash_flow_summary() is available under our
-- current access grant before proposing this version.
WITH cf AS (
  SELECT
    period,
    net_interest_income,
    total_obligations
  FROM vault.acred.cash_flow_summary()
  WHERE period >= date_trunc('month', now()) - interval '3 months'
)
SELECT
  period,
  net_interest_income / nullif(total_obligations, 0) AS dscr
FROM cf
ORDER BY period DESC;`

// ── Analyses ──────────────────────────────────────────────────────────────────

export const analyses: Analysis[] = [
  // 1. acred_advance_rate — v2 executing, v1 retired, v3 proposed
  {
    id: 'acred_advance_rate',
    name: 'acred_advance_rate',
    slug: 'acred_advance_rate',
    vaultId: 'acred',
    vaultLabel: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    status: 'approved_executing',
    currentVersion: 2,
    versions: [
      {
        v: 1,
        status: 'retired',
        code: CODE_ADVANCE_RATE_V1,
        proposedAt: daysAgo(45),
        decidedAt: daysAgo(43),
        decision: 'approved',
        reviewer: { name: 'Sarah Chen', org: 'Apollo Asset Mgmt' },
      },
      {
        v: 2,
        status: 'executing',
        code: CODE_ADVANCE_RATE_V2,
        proposedAt: daysAgo(18),
        decidedAt: daysAgo(16),
        decision: 'approved',
        reviewer: { name: 'Sarah Chen', org: 'Apollo Asset Mgmt' },
        decisionNote: 'Approved — first_lien filter is appropriate. Cap raised to 0.85 per updated credit policy.',
      },
      {
        v: 3,
        status: 'proposed',
        code: CODE_ADVANCE_RATE_V3,
        proposedAt: daysAgo(2),
        reviewer: undefined,
        decisionNote: undefined,
      },
    ],
    trigger: { kind: 'cron', expr: '0 * * * *', humanized: 'every hour' },
    destinations: [
      { kind: 'onchain', chain: 'ethereum', address: '0x7f268357A8c2552623316e2562D90e642bB538E5', label: 'Morpho Oracle' },
      { kind: 'onchain', chain: 'base', address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', label: 'Gauntlet Risk Engine' },
    ],
    lastExecutedAt: minsAgo(12),
    executionsToday: 24,
    executionsLast7d: 167,
  },

  // 2. acred_nav_freshness — executing
  {
    id: 'acred_nav_freshness',
    name: 'acred_nav_freshness',
    slug: 'acred_nav_freshness',
    vaultId: 'acred',
    vaultLabel: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    status: 'approved_executing',
    currentVersion: 1,
    versions: [
      {
        v: 1,
        status: 'executing',
        code: CODE_NAV_FRESHNESS,
        proposedAt: daysAgo(30),
        decidedAt: daysAgo(28),
        decision: 'approved',
        reviewer: { name: 'Sarah Chen', org: 'Apollo Asset Mgmt' },
        decisionNote: 'Approved. Freshness thresholds are reasonable.',
      },
    ],
    trigger: { kind: 'cron', expr: '*/15 * * * *', humanized: 'every 15 min' },
    destinations: [
      { kind: 'onchain', chain: 'ethereum', address: '0x7f268357A8c2552623316e2562D90e642bB538E5', label: 'Morpho Oracle' },
    ],
    lastExecutedAt: minsAgo(3),
    executionsToday: 96,
    executionsLast7d: 671,
  },

  // 3. acred_ltv_band_cap — changes_requested
  {
    id: 'acred_ltv_band_cap',
    name: 'acred_ltv_band_cap',
    slug: 'acred_ltv_band_cap',
    vaultId: 'acred',
    vaultLabel: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    status: 'changes_requested',
    currentVersion: 1,
    versions: [
      {
        v: 1,
        status: 'changes_requested',
        code: CODE_LTV_BAND_CAP,
        proposedAt: daysAgo(5),
        decidedAt: daysAgo(3),
        decision: 'changes_requested',
        reviewer: { name: 'James Waller', org: 'Apollo Asset Mgmt' },
        decisionNote: 'ltv_ratio column is not exposed under current schema grant. Request access to positions_extended schema or rewrite against ltv_band enum which is available. See schema v2.3 changelog.',
      },
    ],
    trigger: { kind: 'cron', expr: '0 8 * * *', humanized: 'daily at 08:00 UTC' },
    destinations: [
      { kind: 'onchain', chain: 'arbitrum', address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906', label: 'Gauntlet v2 (ARB)' },
    ],
    lastExecutedAt: undefined,
    executionsToday: 0,
    executionsLast7d: 0,
  },

  // 4. acred_concentration_check — denied
  {
    id: 'acred_concentration_check',
    name: 'acred_concentration_check',
    slug: 'acred_concentration_check',
    vaultId: 'acred',
    vaultLabel: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    status: 'denied',
    currentVersion: 1,
    versions: [
      {
        v: 1,
        status: 'denied',
        code: CODE_CONCENTRATION_CHECK,
        proposedAt: daysAgo(10),
        decidedAt: daysAgo(8),
        decision: 'denied',
        reviewer: { name: 'Sarah Chen', org: 'Apollo Asset Mgmt' },
        decisionNote: 'Denied. obligor_name and industry_code are Tier 3 (confidential) under the fund\'s current data classification policy. Analysis would expose portfolio composition to counterparty before public disclosure. Propose rewrite against aggregated buckets only — obligor_id hashes are acceptable.',
      },
    ],
    trigger: { kind: 'cron', expr: '0 6 * * *', humanized: 'daily at 06:00 UTC' },
    destinations: [
      { kind: 'http', url: 'https://api.gauntlet.xyz/v2/risk/acred/concentration', label: 'Gauntlet risk API' },
    ],
    lastExecutedAt: undefined,
    executionsToday: 0,
    executionsLast7d: 0,
  },

  // 5. acred_redemption_event — event-triggered, executing
  {
    id: 'acred_redemption_event',
    name: 'acred_redemption_event',
    slug: 'acred_redemption_event',
    vaultId: 'acred',
    vaultLabel: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    status: 'approved_executing',
    currentVersion: 1,
    versions: [
      {
        v: 1,
        status: 'executing',
        code: CODE_REDEMPTION_EVENT,
        proposedAt: daysAgo(25),
        decidedAt: daysAgo(23),
        decision: 'approved',
        reviewer: { name: 'Sarah Chen', org: 'Apollo Asset Mgmt' },
        decisionNote: 'Approved. Redemption queue is permissible for counterparties with active lending exposure.',
      },
    ],
    trigger: { kind: 'event', sourceLabel: 'ACRED redemption queue' },
    destinations: [
      { kind: 'onchain', chain: 'ethereum', address: '0x7f268357A8c2552623316e2562D90e642bB538E5', label: 'Morpho Oracle' },
      { kind: 'http', url: 'https://api.gauntlet.xyz/v2/risk/acred/redemption', label: 'Gauntlet risk API' },
    ],
    lastExecutedAt: hoursAgo(7),
    executionsToday: 1,
    executionsLast7d: 4,
  },

  // 6. acred_dscr_check — draft
  {
    id: 'acred_dscr_check',
    name: 'acred_dscr_check',
    slug: 'acred_dscr_check',
    vaultId: 'acred',
    vaultLabel: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    status: 'draft',
    currentVersion: 1,
    versions: [
      {
        v: 1,
        status: 'draft',
        code: CODE_DSCR_CHECK,
        proposedAt: daysAgo(1),
      },
    ],
    trigger: { kind: 'cron', expr: '0 0 1 * *', humanized: 'monthly on the 1st' },
    destinations: [
      { kind: 'http', url: 'https://api.gauntlet.xyz/v2/risk/acred/dscr', label: 'Gauntlet risk API' },
    ],
    lastExecutedAt: undefined,
    executionsToday: 0,
    executionsLast7d: 0,
  },
]

// ── Executions ────────────────────────────────────────────────────────────────
// ~40 executions, scattered across ~5 days, mostly success, a few failures/partials.

function makeHash64(): string {
  const chars = '0123456789abcdef'
  let h = '0x'
  for (let i = 0; i < 64; i++) h += chars[Math.floor(Math.random() * 16)]
  return h
}

function makeHash130(): string {
  const chars = '0123456789abcdef'
  let h = '0x'
  for (let i = 0; i < 130; i++) h += chars[Math.floor(Math.random() * 16)]
  return h
}

// Deterministic-looking hashes for fixtures (no actual randomness in output)
const HASHES = {
  payloads: [
    '0x3a7f2c1d8e4b9056af3c2e1d8b4f9a0c5e7d3b2a1f6e4c9b8d7a3c0e5f2b4a6d',
    '0x9b2e5f8c4a1d7e3b6f0a2c9d5b8e1f4c7a3d6b9e2f5c8a1d4e7b0c3f6a9d2e5b',
    '0x5c8a1d4e7b0c3f6a9d2e5b8c1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d',
    '0x1d4e7b0c3f6a9d2e5b8c1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b',
    '0x7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b',
    '0xf6a9d2e5b8c1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9',
    '0xc4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7',
    '0xa8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1',
    '0xe2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5',
    '0xb0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3',
    '0x6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e',
    '0xd5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8',
    '0x4a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d',
    '0x8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c',
    '0x2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a',
    '0x9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f',
    '0x3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b',
    '0x7c0f3a6d9e2b5c8f1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f',
    '0xd4e7b0a3c6f9e2b5a8d1c4f7e0b3a6d9c2f5e8b1a4d7c0f3e6b9a2d5c8f1e4b7a0',
    '0x1a4d7e0b3f6c9a2d5e8b1c4f7a0d3e6b9c2f5a8d1e4b7c0f3a6d9e2b5c8f1a4d7',
  ],
  sigs: [
    '0x4a8c2e1d7b3f5a9c0e6b4d2f8a1c3e5b7d9f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4',
    '0x8d1e4b7a0c3f6d9b2e5a8c1f4b7d0e3a6c9f2b5d8a1e4c7f0b3d6a9c2e5b8f1d4a7c0f3b6d9a2e5c8b1f4d7a0e3c6b9f2a5d8c1e4b7f0a3d6c9e2b5a8f1d4c7e0b3',
    '0xc3f6a9d2b5e8c1f4a7d0e3b6c9f2a5d8e1c4f7b0d3a6e9c2f5b8a1d4c7f0e3b6a9d2c5f8b1e4a7c0f3d6b9a2e5c8f1d4b7a0e3c6f9d2b5a8c1e4b7f0d3a6c9e2b5a8',
    '0xe5b8c1a4d7f0e3b6c9f2a5d8b1e4c7a0d3f6b9e2c5a8f1d4b7c0e3a6f9d2c5b8a1e4d7c0f3b6a9e2d5c8f1b4a7e0d3c6f9b2e5a8c1d4f7b0e3a6c9f2d5b8a1e4c7f0',
    '0x2b5a8d1e4c7f0b3a6d9c2e5b8f1a4d7c0e3f6b9a2d5c8f1e4b7a0d3c6f9e2b5a8d1c4f7b0e3a6c9f2b5d8a1e4c7f0d3b6a9e2d5c8f1b4a7d0e3c6f9b2e5a8c1d4f7b0',
  ],
  fps: [
    '0x4a8c2e1d',
    '0x9b3f7a2c',
    '0xc5d8e1f4',
    '0x1a3c5e7b',
    '0x7f2a4c6e',
  ],
  snapshots: [
    '0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
    '0xa9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7',
    '0x5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2',
    '0xd7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5',
  ],
  txHashes: [
    '0xaabc123def456789abbc123def456789abbc123def456789abbc123def456789aa',
    '0xbbcd234ef5678901bccd234ef5678901bccd234ef5678901bccd234ef5678901bb',
    '0xccde345f06789012cdde345f06789012cdde345f06789012cdde345f06789012cc',
    '0xddef456a178901234ddef456a178901234ddef456a178901234ddef456a17890dd',
    '0xeef0567b289012345eef0567b289012345eef0567b289012345eef0567b28901ee',
    '0xff01678c39012345670f01678c390123456701678c390123456701678c3901230ff',
    '0x1102789d4a123456781102789d4a12345678102789d4a12345678102789d4a12311',
    '0x22038a9e5b12345678922038a9e5b123456789038a9e5b12345678903a9e5b123222',
    '0x33049baf6c234567890a3049baf6c234567890a049baf6c234567890a4baf6c12333',
    '0x4405acb07d345678901b4405acb07d345678901b405acb07d345678901b5acb07344',
    '0x5506bdc18e456789012c5506bdc18e456789012c506bdc18e456789012c6bdc18455',
    '0x6607ced29f567890123d6607ced29f567890123d607ced29f567890123d7ced29566',
  ],
}

const makeRow = (
  id: string,
  analysisId: string,
  analysisName: string,
  version: number,
  minutesAgo: number,
  latencyMs: number,
  status: ExecutionStatus,
  payloadPreview: string,
  phIdx: number,
  sigIdx: number,
  fpIdx: number,
  snapIdx: number,
  destinations: Execution['destinations'],
): Execution => ({
  id,
  analysisId,
  analysisName,
  version,
  executedAt: minsAgo(minutesAgo),
  latencyMs,
  status,
  payloadPreview,
  payloadHash: HASHES.payloads[phIdx % HASHES.payloads.length],
  signature: HASHES.sigs[sigIdx % HASHES.sigs.length],
  signingKeyFingerprint: HASHES.fps[fpIdx % HASHES.fps.length],
  vaultSnapshotHash: HASHES.snapshots[snapIdx % HASHES.snapshots.length],
  destinations,
})

// Destination helpers
const ethAndBase = (txIdx: number): Execution['destinations'] => [
  { kind: 'onchain', chain: 'ethereum', txHash: HASHES.txHashes[txIdx % HASHES.txHashes.length], blockNumber: 19_902_411 + txIdx },
  { kind: 'onchain', chain: 'base', txHash: HASHES.txHashes[(txIdx + 1) % HASHES.txHashes.length], blockNumber: 14_502_318 + txIdx },
]
const ethOnly = (txIdx: number): Execution['destinations'] => [
  { kind: 'onchain', chain: 'ethereum', txHash: HASHES.txHashes[txIdx % HASHES.txHashes.length], blockNumber: 19_902_411 + txIdx },
]
const arbOnly = (txIdx: number): Execution['destinations'] => [
  { kind: 'onchain', chain: 'arbitrum', txHash: HASHES.txHashes[txIdx % HASHES.txHashes.length], blockNumber: 200_442_817 + txIdx * 47 },
]
const ethAndHttp = (txIdx: number): Execution['destinations'] => [
  { kind: 'onchain', chain: 'ethereum', txHash: HASHES.txHashes[txIdx % HASHES.txHashes.length], blockNumber: 19_902_411 + txIdx },
  { kind: 'http', url: 'https://api.gauntlet.xyz/v2/risk/acred/redemption', statusCode: 200, deliveredAt: minsAgo(txIdx * 2 + 1) },
]

export const executions: Execution[] = [
  // ── advance_rate (v2, every hour, eth+base) ─────────────────────────────────
  makeRow('exec-ar-01', 'acred_advance_rate', 'acred_advance_rate', 2, 12, 312, 'success', '{"advance_rate":0.8234,"nav_usd":1247318402,"eligible_par":1023841200,"as_of":"2026-05-16T09:48:00Z"}', 0, 0, 0, 0, ethAndBase(0)),
  makeRow('exec-ar-02', 'acred_advance_rate', 'acred_advance_rate', 2, 72, 289, 'success', '{"advance_rate":0.8219,"nav_usd":1247318402,"eligible_par":1022941800,"as_of":"2026-05-16T08:48:00Z"}', 1, 1, 0, 1, ethAndBase(2)),
  makeRow('exec-ar-03', 'acred_advance_rate', 'acred_advance_rate', 2, 132, 341, 'success', '{"advance_rate":0.8251,"nav_usd":1247318402,"eligible_par":1024512000,"as_of":"2026-05-16T07:48:00Z"}', 2, 2, 0, 2, ethAndBase(4)),
  makeRow('exec-ar-04', 'acred_advance_rate', 'acred_advance_rate', 2, 192, 418, 'success', '{"advance_rate":0.8229,"nav_usd":1247212000,"eligible_par":1023001400,"as_of":"2026-05-16T06:48:00Z"}', 3, 3, 0, 3, ethAndBase(6)),
  makeRow('exec-ar-05', 'acred_advance_rate', 'acred_advance_rate', 2, 252, 297, 'success', '{"advance_rate":0.8244,"nav_usd":1247100000,"eligible_par":1023521000,"as_of":"2026-05-16T05:48:00Z"}', 4, 4, 0, 0, ethAndBase(8)),
  makeRow('exec-ar-06', 'acred_advance_rate', 'acred_advance_rate', 2, 432, 3841, 'failed', '{"error":"vault snapshot too stale: 48s","required_freshness_s":30,"actual_age_s":78}', 5, 0, 1, 1, []),
  makeRow('exec-ar-07', 'acred_advance_rate', 'acred_advance_rate', 2, 492, 304, 'success', '{"advance_rate":0.8201,"nav_usd":1246800000,"eligible_par":1021998400,"as_of":"2026-05-16T01:48:00Z"}', 6, 1, 0, 2, ethAndBase(10)),
  makeRow('exec-ar-08', 'acred_advance_rate', 'acred_advance_rate', 2, 552, 388, 'success', '{"advance_rate":0.8218,"nav_usd":1246800000,"eligible_par":1023001000,"as_of":"2026-05-16T00:48:00Z"}', 7, 2, 0, 3, ethAndBase(12)),
  makeRow('exec-ar-09', 'acred_advance_rate', 'acred_advance_rate', 2, 972, 312, 'success', '{"advance_rate":0.8239,"nav_usd":1246500000,"eligible_par":1023800000,"as_of":"2026-05-15T18:48:00Z"}', 8, 3, 0, 0, ethAndBase(14)),
  makeRow('exec-ar-10', 'acred_advance_rate', 'acred_advance_rate', 2, 1032, 288, 'success', '{"advance_rate":0.8231,"nav_usd":1246500000,"eligible_par":1023200000,"as_of":"2026-05-15T17:48:00Z"}', 9, 4, 0, 1, ethAndBase(16)),
  makeRow('exec-ar-11', 'acred_advance_rate', 'acred_advance_rate', 2, 1452, 301, 'success', '{"advance_rate":0.8243,"nav_usd":1246300000,"eligible_par":1023700000,"as_of":"2026-05-15T13:48:00Z"}', 10, 0, 0, 2, ethAndBase(18)),
  makeRow('exec-ar-12', 'acred_advance_rate', 'acred_advance_rate', 2, 2892, 394, 'success', '{"advance_rate":0.8227,"nav_usd":1245900000,"eligible_par":1022800000,"as_of":"2026-05-14T21:48:00Z"}', 11, 1, 0, 3, ethAndBase(20)),

  // ── nav_freshness (v1, every 15 min, eth only) ──────────────────────────────
  makeRow('exec-nf-01', 'acred_nav_freshness', 'acred_nav_freshness', 1, 3, 88, 'success', '{"freshness":"fresh","age_seconds":1823,"current_nav":1247318402,"nav_source":"ALPS API"}', 12, 0, 2, 0, ethOnly(22)),
  makeRow('exec-nf-02', 'acred_nav_freshness', 'acred_nav_freshness', 1, 18, 92, 'success', '{"freshness":"fresh","age_seconds":2015,"current_nav":1247318402,"nav_source":"ALPS API"}', 13, 1, 2, 1, ethOnly(24)),
  makeRow('exec-nf-03', 'acred_nav_freshness', 'acred_nav_freshness', 1, 33, 79, 'success', '{"freshness":"fresh","age_seconds":2812,"current_nav":1247318402,"nav_source":"ALPS API"}', 14, 2, 2, 2, ethOnly(26)),
  makeRow('exec-nf-04', 'acred_nav_freshness', 'acred_nav_freshness', 1, 48, 4012, 'partial', '{"freshness":"fresh","age_seconds":3441,"current_nav":1247318402,"nav_source":"ALPS API","warnings":["ethereum write delayed: node timeout, retried 1x"]}', 15, 3, 2, 3, ethOnly(28)),
  makeRow('exec-nf-05', 'acred_nav_freshness', 'acred_nav_freshness', 1, 63, 91, 'success', '{"freshness":"fresh","age_seconds":4019,"current_nav":1247318402,"nav_source":"ALPS API"}', 16, 4, 2, 0, ethOnly(30)),
  makeRow('exec-nf-06', 'acred_nav_freshness', 'acred_nav_freshness', 1, 78, 84, 'success', '{"freshness":"fresh","age_seconds":4802,"current_nav":1247318402,"nav_source":"ALPS API"}', 17, 0, 2, 1, ethOnly(32)),
  makeRow('exec-nf-07', 'acred_nav_freshness', 'acred_nav_freshness', 1, 93, 96, 'success', '{"freshness":"fresh","age_seconds":5612,"current_nav":1247318402,"nav_source":"ALPS API"}', 18, 1, 2, 2, ethOnly(34)),
  makeRow('exec-nf-08', 'acred_nav_freshness', 'acred_nav_freshness', 1, 108, 89, 'success', '{"freshness":"fresh","age_seconds":6401,"current_nav":1247318402,"nav_source":"ALPS API"}', 19, 2, 2, 3, ethOnly(36)),
  makeRow('exec-nf-09', 'acred_nav_freshness', 'acred_nav_freshness', 1, 123, 91, 'success', '{"freshness":"fresh","age_seconds":7214,"current_nav":1247318402,"nav_source":"ALPS API"}', 0, 3, 2, 0, ethOnly(38)),
  makeRow('exec-nf-10', 'acred_nav_freshness', 'acred_nav_freshness', 1, 138, 3120, 'failed', '{"error":"vault snapshot too stale: 48s","required_freshness_s":30,"actual_age_s":78}', 1, 4, 2, 1, []),
  makeRow('exec-nf-11', 'acred_nav_freshness', 'acred_nav_freshness', 1, 153, 83, 'success', '{"freshness":"fresh","age_seconds":9217,"current_nav":1247318402,"nav_source":"ALPS API"}', 2, 0, 2, 2, ethOnly(40)),
  makeRow('exec-nf-12', 'acred_nav_freshness', 'acred_nav_freshness', 1, 168, 97, 'success', '{"freshness":"fresh","age_seconds":10024,"current_nav":1247318402,"nav_source":"ALPS API"}', 3, 1, 2, 3, ethOnly(42)),

  // ── redemption_event (v1, event-triggered, eth+http) ───────────────────────
  makeRow('exec-re-01', 'acred_redemption_event', 'acred_redemption_event', 1, 420, 218, 'success', '{"pending_redemptions":2,"total_amount_usd":4182000,"oldest_pending_at":"2026-05-14T08:12:00Z"}', 4, 0, 3, 0, ethAndHttp(44)),
  makeRow('exec-re-02', 'acred_redemption_event', 'acred_redemption_event', 1, 1260, 241, 'success', '{"pending_redemptions":1,"total_amount_usd":980000,"oldest_pending_at":"2026-05-13T14:30:00Z"}', 5, 1, 3, 1, ethAndHttp(46)),
  makeRow('exec-re-03', 'acred_redemption_event', 'acred_redemption_event', 1, 2820, 229, 'success', '{"pending_redemptions":3,"total_amount_usd":7410000,"oldest_pending_at":"2026-05-12T09:00:00Z"}', 6, 2, 3, 2, ethAndHttp(48)),
  makeRow('exec-re-04', 'acred_redemption_event', 'acred_redemption_event', 1, 4380, 4219, 'partial', '{"pending_redemptions":1,"total_amount_usd":2100000,"warnings":["http endpoint returned 429, delivery skipped"]}', 7, 3, 3, 3, [{ kind: 'onchain', chain: 'ethereum', txHash: HASHES.txHashes[0], blockNumber: 19_900_112 }]),

  // ── Additional advance_rate older entries ────────────────────────────────────
  makeRow('exec-ar-13', 'acred_advance_rate', 'acred_advance_rate', 2, 4332, 315, 'success', '{"advance_rate":0.8210,"nav_usd":1245700000,"eligible_par":1022400000,"as_of":"2026-05-13T02:48:00Z"}', 8, 0, 0, 0, ethAndBase(50)),
  makeRow('exec-ar-14', 'acred_advance_rate', 'acred_advance_rate', 2, 5772, 331, 'success', '{"advance_rate":0.8203,"nav_usd":1245500000,"eligible_par":1022100000,"as_of":"2026-05-12T13:48:00Z"}', 9, 1, 0, 1, ethAndBase(52)),
  makeRow('exec-ar-15', 'acred_advance_rate', 'acred_advance_rate', 2, 7212, 302, 'success', '{"advance_rate":0.8198,"nav_usd":1245200000,"eligible_par":1021600000,"as_of":"2026-05-12T00:48:00Z"}', 10, 2, 0, 2, ethAndBase(54)),

  // ── nav_freshness older ──────────────────────────────────────────────────────
  makeRow('exec-nf-13', 'acred_nav_freshness', 'acred_nav_freshness', 1, 1440, 88, 'success', '{"freshness":"fresh","age_seconds":1200,"current_nav":1247318402,"nav_source":"ALPS API"}', 11, 3, 2, 3, ethOnly(56)),
  makeRow('exec-nf-14', 'acred_nav_freshness', 'acred_nav_freshness', 1, 2880, 91, 'success', '{"freshness":"fresh","age_seconds":1400,"current_nav":1246100000,"nav_source":"ALPS API"}', 12, 4, 2, 0, ethOnly(58)),
  makeRow('exec-nf-15', 'acred_nav_freshness', 'acred_nav_freshness', 1, 4320, 87, 'success', '{"freshness":"fresh","age_seconds":1100,"current_nav":1245800000,"nav_source":"ALPS API"}', 13, 0, 2, 1, ethOnly(60)),
  makeRow('exec-nf-16', 'acred_nav_freshness', 'acred_nav_freshness', 1, 5760, 94, 'success', '{"freshness":"fresh","age_seconds":900,"current_nav":1245500000,"nav_source":"ALPS API"}', 14, 1, 2, 2, ethOnly(62)),
]

// ── Vault schemas ─────────────────────────────────────────────────────────────

const ACRED_FUNCTIONS: VaultFunction[] = [
  {
    name: 'nav_latest',
    signature: 'vault.acred.nav_latest() RETURNS row',
    description: 'Current NAV snapshot with per-share price and next publication timestamp.',
    cadence: 'updated every 1m',
    fields: [
      { name: 'current_nav',   type: 'NUMERIC',    tier: 'public',  description: 'Total fund NAV in USD at snapshot time' },
      { name: 'snapshot_at',   type: 'TIMESTAMP',  tier: 'public',  description: 'UTC timestamp when this NAV was computed' },
      { name: 'nav_per_share', type: 'NUMERIC',    tier: 'public',  description: 'NAV per share / unit in USD' },
      { name: 'next_nav_at',   type: 'TIMESTAMP',  tier: 'public',  description: 'Scheduled timestamp for the next NAV publication' },
      { name: 'nav_source',    type: 'TEXT',       tier: 'tier_1',  description: 'Administrator system that produced this NAV (e.g. ALPS API)' },
      { name: 'nav_delta_pct', type: 'NUMERIC',    tier: 'tier_1',  description: 'NAV change since last snapshot as a fraction (e.g. 0.0012)' },
    ],
  },
  {
    name: 'positions_snapshot',
    signature: 'vault.acred.positions_snapshot() RETURNS TABLE',
    description: 'Open position rows as of the most recent ingest. One row per position.',
    cadence: 'updated every 15m',
    fields: [
      { name: 'par_value',     type: 'NUMERIC',    tier: 'public',  description: 'Face/par value of the position in USD' },
      { name: 'status',        type: 'TEXT',       tier: 'public',  description: 'Performing status: performing | watch | non_performing' },
      { name: 'asset_class',   type: 'TEXT',       tier: 'public',  description: 'Asset class bucket: senior_secured_loan | first_lien | second_lien | subordinated | other' },
      { name: 'vintage_year',  type: 'NUMERIC',    tier: 'tier_1',  description: 'Year the loan was originated' },
      { name: 'coupon_rate',   type: 'NUMERIC',    tier: 'tier_2',  description: 'Current coupon rate as a decimal (e.g. 0.0875 = 8.75%)' },
      { name: 'ltv_band',      type: 'TEXT',       tier: 'tier_2',  description: 'LTV tier bucket: <50% | 50-65% | 65-75% | 75-85% | >85%' },
      { name: 'obligor_name',  type: 'TEXT',       tier: 'tier_3',  description: 'Legal name of the obligor (borrower)' },
      { name: 'industry_code', type: 'TEXT',       tier: 'tier_3',  description: 'NAICS 2-digit industry classification code' },
      { name: 'obligor_id',    type: 'TEXT',       tier: 'tier_1',  description: 'Anonymized obligor identifier (stable hash, not name)' },
    ],
  },
  {
    name: 'vintage_summary',
    signature: 'vault.acred.vintage_summary() RETURNS TABLE',
    description: 'Aggregate portfolio metrics grouped by origination vintage year.',
    cadence: 'updated daily',
    fields: [
      { name: 'vintage_year',      type: 'NUMERIC', tier: 'public',  description: 'Origination year of the cohort' },
      { name: 'total_par',         type: 'NUMERIC', tier: 'public',  description: 'Total par value of performing positions in this vintage' },
      { name: 'position_count',    type: 'NUMERIC', tier: 'public',  description: 'Number of positions in this vintage cohort' },
      { name: 'wac',               type: 'NUMERIC', tier: 'tier_1',  description: 'Weighted average coupon across the vintage' },
      { name: 'wal_years',         type: 'NUMERIC', tier: 'tier_1',  description: 'Weighted average life remaining in years' },
      { name: 'default_rate_ytd',  type: 'NUMERIC', tier: 'tier_2',  description: 'Year-to-date default rate for this vintage (fraction)' },
      { name: 'recovery_rate_avg', type: 'NUMERIC', tier: 'tier_2',  description: 'Average recovery rate on defaulted positions in this vintage' },
    ],
  },
  {
    name: 'redemption_queue',
    signature: 'vault.acred.redemption_queue() RETURNS TABLE',
    description: 'Pending investor redemption requests and cycle timing.',
    cadence: 'updated on redemption events',
    fields: [
      { name: 'pending_usd',   type: 'NUMERIC',   tier: 'public',  description: 'Total USD value of pending redemption requests' },
      { name: 'next_cycle_at', type: 'TIMESTAMP', tier: 'public',  description: 'Timestamp of the next redemption settlement cycle' },
      { name: 'holder_count',  type: 'NUMERIC',   tier: 'tier_1',  description: 'Number of distinct holders with pending requests' },
      { name: 'oldest_at',     type: 'TIMESTAMP', tier: 'tier_1',  description: 'Timestamp of the oldest pending redemption request' },
      { name: 'status',        type: 'TEXT',       tier: 'public',  description: 'Queue status: pending | processing | settled' },
    ],
  },
]

const MAPLE_FUNCTIONS: VaultFunction[] = [
  {
    name: 'pool_summary',
    signature: 'vault.maple_tf.pool_summary() RETURNS row',
    description: 'Current state of the trade finance revolving credit pool.',
    cadence: 'updated every 5m',
    fields: [
      { name: 'total_committed_usd', type: 'NUMERIC',   tier: 'public',  description: 'Total committed capital in the pool' },
      { name: 'deployed_usd',        type: 'NUMERIC',   tier: 'public',  description: 'Currently deployed (outstanding loans)' },
      { name: 'utilization_rate',    type: 'NUMERIC',   tier: 'public',  description: 'deployed / committed as a fraction' },
      { name: 'snapshot_at',         type: 'TIMESTAMP', tier: 'public',  description: 'Snapshot UTC timestamp' },
      { name: 'wac',                 type: 'NUMERIC',   tier: 'tier_1',  description: 'Weighted average coupon of deployed loans' },
      { name: 'avg_tenor_days',      type: 'NUMERIC',   tier: 'tier_1',  description: 'Average loan tenor in days' },
    ],
  },
  {
    name: 'loan_book',
    signature: 'vault.maple_tf.loan_book() RETURNS TABLE',
    description: 'Individual trade finance loan records.',
    cadence: 'updated every 15m',
    fields: [
      { name: 'loan_id',          type: 'TEXT',       tier: 'tier_1', description: 'Anonymized loan identifier' },
      { name: 'principal_usd',    type: 'NUMERIC',    tier: 'tier_1', description: 'Outstanding principal in USD' },
      { name: 'maturity_date',    type: 'TIMESTAMP',  tier: 'tier_1', description: 'Loan maturity date' },
      { name: 'status',           type: 'TEXT',       tier: 'public', description: 'Loan status: active | matured | defaulted' },
      { name: 'borrower_country', type: 'TEXT',       tier: 'tier_2', description: 'ISO 3166-1 alpha-2 country code of the borrower' },
      { name: 'borrower_name',    type: 'TEXT',       tier: 'tier_3', description: 'Legal name of the borrowing entity' },
    ],
  },
]

const BUIDL_FUNCTIONS: VaultFunction[] = [
  {
    name: 'nav_latest',
    signature: 'vault.buidl.nav_latest() RETURNS row',
    description: 'BUIDL fund NAV snapshot.',
    cadence: 'updated daily at market close',
    fields: [
      { name: 'current_nav',   type: 'NUMERIC',    tier: 'public', description: 'Total fund NAV in USD' },
      { name: 'snapshot_at',   type: 'TIMESTAMP',  tier: 'public', description: 'NAV as-of timestamp' },
      { name: 'nav_per_share', type: 'NUMERIC',    tier: 'public', description: 'NAV per share — maintained near $1.00' },
      { name: 'shares_issued', type: 'NUMERIC',    tier: 'public', description: 'Total shares outstanding' },
    ],
  },
]

// ── Vaults ────────────────────────────────────────────────────────────────────

export const vaults: ConsumerVault[] = [
  {
    id: 'acred',
    name: 'ACRED',
    label: 'ACRED · Apollo Diversified Credit',
    provider: { orgId: 'org_apollo', name: 'Apollo Asset Mgmt' },
    myAccessLevel: 'author',
    schemaCount: 8,
    myAnalysisCount: 6,
    grantedAt: daysAgo(60),
    grantedBy: 'Sarah Chen',
    lastProviderUpdateAt: minsAgo(11),
    functions: ACRED_FUNCTIONS,
    accessibleTiers: ['public', 'tier_1', 'tier_2'],
  },
  {
    id: 'maple-tf-revolver',
    name: 'MAPLE-TF',
    label: 'MAPLE-TF · Maple Trade Finance Revolver',
    provider: { orgId: 'org_maple', name: 'Maple Finance' },
    myAccessLevel: 'author',
    schemaCount: 4,
    myAnalysisCount: 1,
    grantedAt: daysAgo(30),
    grantedBy: 'Sidney Lim',
    lastProviderUpdateAt: hoursAgo(6),
    functions: MAPLE_FUNCTIONS,
    accessibleTiers: ['public', 'tier_1', 'tier_2'],
  },
  {
    id: 'buidl-treasury',
    name: 'BUIDL',
    label: 'BUIDL · BlackRock USD Institutional Digital Liquidity',
    provider: { orgId: 'org_securitize', name: 'Securitize Fund Services' },
    myAccessLevel: 'read',
    schemaCount: 3,
    myAnalysisCount: 0,
    grantedAt: daysAgo(14),
    grantedBy: 'Mark Torres',
    lastProviderUpdateAt: minsAgo(8),
    functions: BUIDL_FUNCTIONS,
    accessibleTiers: ['public'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function findVault(id: string): ConsumerVault | undefined {
  return vaults.find((v) => v.id === id)
}

export function findAnalysis(id: string): Analysis | undefined {
  return analyses.find((a) => a.id === id)
}

export function executionsFor(analysisId: string, limit?: number): Execution[] {
  const rows = executions
    .filter((e) => e.analysisId === analysisId)
    .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
  return limit !== undefined ? rows.slice(0, limit) : rows
}

export function analysesForVault(vaultId: string): Analysis[] {
  return analyses.filter((a) => a.vaultId === vaultId)
}

/** Truncate a 0x-prefixed hex to 0xabcd…1234 form */
export function truncateHash(hash: string, headChars = 4, tailChars = 4): string {
  if (hash.length <= headChars + tailChars + 2) return hash
  return `${hash.slice(0, 2 + headChars)}…${hash.slice(-tailChars)}`
}
