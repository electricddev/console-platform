/**
 * Counterparty (consumer) demo fixtures — Gauntlet (org_gauntlet) consuming
 * ACRED (Apollo Diversified Credit) and other vaults.
 *
 * Pure TypeScript types, no Zod. These are demo fixtures, not API responses.
 * Vocabulary: author / propose / approve / version / execute / sign / publish.
 * NEVER: subscribe / feed / stream / deliver / oracle / endpoint subscription.
 */

import type { PrivacyLevel } from '@/components/v2/features/vault-detail/data-fixture'

// ── Time helpers ──────────────────────────────────────────────────────────────

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

// ── Core types ────────────────────────────────────────────────────────────────

export type { PrivacyLevel }

export type VaultFieldType = 'NUMERIC' | 'TIMESTAMP' | 'TEXT' | 'BOOLEAN' | 'BYTES' | 'JSONB'

export type VaultField = {
  name: string
  type: VaultFieldType
  privacy: PrivacyLevel
  description: string
  /** Minimum distinct identifiers required in an aggregate. Only relevant on aggregate-tier fields. */
  kMin?: number
}

export type VaultTemplate = {
  id: string
  name: string
  description: string
  privacyMix: PrivacyLevel[]
  code: string
}

export type VaultTable = {
  name: string
  description: string
  fields: VaultField[]
  /** Human-readable cadence, e.g. "every 1m", "every 15m", "daily". */
  refreshCadence: string
  /** One-line provenance hint, e.g. "Apollo PMS → daily reconciliation → vault". */
  lineageHint?: string
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
  tables: VaultTable[]
  /**
   * Privacy levels accessible under this grant.
   * 'private' is never included — blocked at ingest, no path out.
   */
  accessibleOperations: PrivacyLevel[]
  /** Pre-approved query templates for this vault. */
  templates: VaultTemplate[]
}

// ── Analysis code snippets ────────────────────────────────────────────────────

const CODE_ADVANCE_RATE_V1 = `-- acred_advance_rate v1
WITH nav AS (
  SELECT aum_usd, as_of
  FROM vault.acred.nav_history
  ORDER BY as_of DESC
  LIMIT 1
),
collateral AS (
  SELECT SUM(par_value) AS total_par
  FROM vault.acred.loan_tape
  WHERE status = 'performing'
)
SELECT
  least(0.80, collateral.total_par * 0.90 / nav.aum_usd) AS advance_rate,
  nav.as_of                                              AS as_of
FROM nav, collateral;`

const CODE_ADVANCE_RATE_V2 = `-- acred_advance_rate v2  (approved, executing)
WITH nav AS (
  SELECT aum_usd, as_of
  FROM vault.acred.nav_history
  ORDER BY as_of DESC
  LIMIT 1
),
collateral AS (
  SELECT SUM(par_value) AS total_par
  FROM vault.acred.loan_tape
  WHERE status = 'performing'
    AND asset_class IN ('senior_secured_loan', 'first_lien')
)
SELECT
  least(0.85, collateral.total_par * 0.95 / nav.aum_usd) AS advance_rate,
  nav.aum_usd                                            AS nav_usd,
  collateral.total_par                                   AS eligible_par,
  nav.as_of                                              AS as_of
FROM nav, collateral;`

const CODE_ADVANCE_RATE_V3 = `-- acred_advance_rate v3  (proposed — pending provider review)
WITH nav AS (
  SELECT aum_usd, as_of
  FROM vault.acred.nav_history
  ORDER BY as_of DESC
  LIMIT 1
),
collateral AS (
  SELECT
    asset_class,
    SUM(par_value) AS total_par
  FROM vault.acred.loan_tape
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
  least(0.87, eligible.weighted_par * 0.95 / nav.aum_usd) AS advance_rate,
  nav.aum_usd                                             AS nav_usd,
  eligible.weighted_par                                   AS eligible_par,
  nav.as_of                                               AS as_of
FROM nav, eligible;`

const CODE_NAV_FRESHNESS = `-- acred_nav_freshness  (approved, executing)
WITH latest AS (
  SELECT as_of, aum_usd, nav_source
  FROM vault.acred.nav_history
  ORDER BY as_of DESC
  LIMIT 1
)
SELECT
  CASE
    WHEN extract(epoch FROM (now() - as_of)) < 3600     THEN 'fresh'
    WHEN extract(epoch FROM (now() - as_of)) < 86400    THEN 'stale'
    ELSE 'critical'
  END                                                   AS freshness,
  as_of,
  extract(epoch FROM (now() - as_of))::int              AS age_seconds,
  aum_usd                                               AS current_nav,
  nav_source
FROM latest;`

const CODE_LTV_BAND_CAP = `-- acred_ltv_band_cap  (changes_requested — provider note below)
WITH nav AS (
  SELECT aum_usd FROM vault.acred.nav_history
  ORDER BY as_of DESC LIMIT 1
),
loans AS (
  SELECT
    obligor_id,
    SUM(par_value) AS exposure,
    MAX(ltv_ratio) AS max_ltv
  FROM vault.acred.loan_tape
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
WITH nav AS (
  SELECT aum_usd FROM vault.acred.nav_history
  ORDER BY as_of DESC LIMIT 1
),
positions AS (
  SELECT
    obligor_id,
    obligor_name,
    industry_code,
    SUM(par_value) AS total_par
  FROM vault.acred.loan_tape
  WHERE status IN ('performing', 'watch')
  GROUP BY obligor_id, obligor_name, industry_code
)
SELECT
  p.obligor_name,
  p.industry_code,
  p.total_par,
  p.total_par / nav.aum_usd AS pct_nav
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
FROM vault.acred.cash_positions
WHERE flow_type = 'redemption'
  AND status = 'pending'
  AND requested_at > now() - interval '24 hours'
ORDER BY requested_at DESC;`

const CODE_DSCR_CHECK = `-- acred_dscr_check  (draft — not yet proposed)
-- TODO: confirm vault.acred.accounting_ledger exposes net_interest_income
-- and total_obligations under our current access grant before proposing.
WITH cf AS (
  SELECT
    period,
    net_interest_income,
    total_obligations
  FROM vault.acred.accounting_ledger
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

// 9 tables — exact 1:1 with the originator's 9 datasets in data-fixture.ts.
// Each CP table is the queryable shape of the corresponding originator dataset.
const ACRED_TABLES: VaultTable[] = [
  // ─── 1 ─ fund_master (Family 1) ──────────────────────────────────────────
  {
    name: 'fund_master',
    description:
      'Fund identity + tokenized share class registry. One row per (fund, share class). Fund-level fields repeat across rows; class fields differ by chain deployment.',
    refreshCadence: 'on change',
    lineageHint: 'Apollo / Securitize fund formation documents → vault reference',
    fields: [
      // Fund identity
      { name: 'fund_id',            type: 'TEXT',      privacy: 'select',    description: 'Fund identifier (e.g. "acred")' },
      { name: 'legal_name',         type: 'TEXT',      privacy: 'select',    description: 'Legal fund name — "Apollo Diversified Credit Securitize Fund"' },
      { name: 'manager',            type: 'TEXT',      privacy: 'select',    description: 'Investment manager — "Apollo Global Management"' },
      { name: 'administrator',      type: 'TEXT',      privacy: 'select',    description: 'Fund administrator — "SS&C Technologies"' },
      { name: 'auditor',            type: 'TEXT',      privacy: 'select',    description: 'External auditor — "PwC"' },
      { name: 'custodian',          type: 'TEXT',      privacy: 'select',    description: 'Primary custodian — "BNY Mellon"' },
      { name: 'domicile',           type: 'TEXT',      privacy: 'select',    description: 'Legal domicile — "Delaware, USA"' },
      { name: 'strategy',           type: 'TEXT',      privacy: 'dimension', description: 'Strategy classification — diversified_credit | direct_lending | abs | treasury | mixed' },
      { name: 'inception_date',     type: 'TIMESTAMP', privacy: 'select',    description: 'Fund inception (2025-01-30 for ACRED)' },
      { name: 'base_currency',      type: 'TEXT',      privacy: 'select',    description: 'Base reporting currency — ISO 4217' },
      { name: 'nav_frequency',      type: 'TEXT',      privacy: 'select',    description: 'NAV strike cadence — daily | weekly | monthly | quarterly' },
      { name: 'is_feeder',          type: 'BOOLEAN',   privacy: 'select',    description: 'True if this is a feeder into a master fund' },
      { name: 'master_fund_lei',    type: 'TEXT',      privacy: 'select',    description: 'Legal Entity Identifier of the master fund (G20 standard)' },
      { name: 'issuer_did',         type: 'TEXT',      privacy: 'select',    description: 'Securitize DID for the tokenized share class' },
      // Share class
      { name: 'class_id',           type: 'TEXT',      privacy: 'select',    description: 'Share class identifier — "acred", "sacred"' },
      { name: 'chain',              type: 'TEXT',      privacy: 'dimension', description: 'Deployed chain — ethereum | aptos | avalanche | polygon | solana | ink | sei' },
      { name: 'contract_address',   type: 'TEXT',      privacy: 'select',    description: 'ERC-20 token contract address on the deployed chain' },
      { name: 'cusip',              type: 'TEXT',      privacy: 'select',    description: 'CUSIP for the share class where assigned' },
      { name: 'isin',               type: 'TEXT',      privacy: 'select',    description: 'ISIN for the share class where assigned' },
      { name: 'min_investment_usd', type: 'NUMERIC',   privacy: 'select',    description: 'Subscription minimum in USD' },
      { name: 'mgmt_fee_bps',       type: 'NUMERIC',   privacy: 'select',    description: 'Annual management fee in basis points' },
      { name: 'perf_fee_bps',       type: 'NUMERIC',   privacy: 'select',    description: 'Performance / carried interest in basis points' },
      { name: 'hurdle_bps',         type: 'NUMERIC',   privacy: 'select',    description: 'Preferred return hurdle in basis points' },
      { name: 'eligibility',        type: 'TEXT',      privacy: 'dimension', description: 'Investor eligibility — "Reg D 506(c) accredited" | "QIB"' },
    ],
  },

  // ─── 2 ─ nav_history (Family 1) ──────────────────────────────────────────
  {
    name: 'nav_history',
    description:
      'Daily NAV strikes — append-only timeseries used for performance computation, freshness checks, and oracle delivery. "Latest" is just ORDER BY as_of DESC LIMIT 1.',
    refreshCadence: 'daily',
    lineageHint: 'SS&C / fund admin daily NAV strike → vault',
    fields: [
      { name: 'fund_id',            type: 'TEXT',      privacy: 'select',    description: 'Fund identifier' },
      { name: 'class_id',           type: 'TEXT',      privacy: 'dimension', description: 'Share class identifier' },
      { name: 'as_of',              type: 'TIMESTAMP', privacy: 'select',    description: 'NAV strike timestamp' },
      { name: 'nav_per_share',      type: 'NUMERIC',   privacy: 'select',    description: 'NAV per share at strike' },
      { name: 'aum_usd',            type: 'NUMERIC',   privacy: 'select',    description: 'Total net assets in USD at strike (the "current NAV" total)' },
      { name: 'shares_outstanding', type: 'NUMERIC',   privacy: 'select',    description: 'Shares outstanding at strike' },
      { name: 'gross_assets',       type: 'NUMERIC',   privacy: 'aggregate', description: 'Gross asset value at strike', kMin: 1 },
      { name: 'total_liabilities',  type: 'NUMERIC',   privacy: 'aggregate', description: 'Total liabilities at strike', kMin: 1 },
      { name: 'accrued_income',     type: 'NUMERIC',   privacy: 'aggregate', description: 'Accrued income since the previous strike', kMin: 1 },
      { name: 'return_daily',       type: 'NUMERIC',   privacy: 'select',    description: 'Daily return as a fraction' },
      { name: 'return_mtd',         type: 'NUMERIC',   privacy: 'select',    description: 'Month-to-date return as a fraction' },
      { name: 'return_qtd',         type: 'NUMERIC',   privacy: 'select',    description: 'Quarter-to-date return as a fraction' },
      { name: 'return_ytd',         type: 'NUMERIC',   privacy: 'select',    description: 'Year-to-date return as a fraction' },
      { name: 'nav_source',         type: 'TEXT',      privacy: 'dimension', description: 'Administrator system that produced this NAV — bloomberg | custodian | manual' },
      { name: 'next_nav_at',        type: 'TIMESTAMP', privacy: 'select',    description: 'Scheduled timestamp for the next NAV publication' },
      { name: 'nav_delta_pct',      type: 'NUMERIC',   privacy: 'aggregate', description: 'NAV change since previous strike — aggregable across time periods' },
      { name: 'attestation_id',     type: 'TEXT',      privacy: 'join',      description: 'TSSO attestation hash for this strike — match key into audit chain' },
    ],
  },

  // ─── 3 ─ loan_tape (Family 3) ────────────────────────────────────────────
  {
    name: 'loan_tape',
    description:
      'Position-level loan tape — one row per outstanding position. AICPA Schedule of Investments (ASC 946) columns plus the 80–120-field private-credit loan-tape standard used by Houlihan Lokey / Bloomberg / Pitchbook.',
    refreshCadence: 'every 15m',
    lineageHint: 'Apollo PMS → daily reconciliation → vault',
    fields: [
      { name: 'position_id',         type: 'TEXT',      privacy: 'join',      description: 'Synthetic position identifier — match key only, never returned' },
      { name: 'as_of',               type: 'TIMESTAMP', privacy: 'select',    description: 'Valuation date for this row' },
      { name: 'obligor_id',          type: 'TEXT',      privacy: 'join',      description: 'Deterministic-hashed obligor identifier — match key only' },
      { name: 'obligor_name',        type: 'TEXT',      privacy: 'private',   description: 'Legal name of the obligor — PII, blocked at ingest' },
      { name: 'instrument_type',     type: 'TEXT',      privacy: 'dimension', description: 'sr_secured_term_loan | unitranche | 2nd_lien | mezz | sub | pref_eq | abl | bond' },
      { name: 'asset_class',         type: 'TEXT',      privacy: 'dimension', description: 'senior_secured_loan | first_lien | second_lien | unitranche | subordinated | other' },
      { name: 'status',              type: 'TEXT',      privacy: 'dimension', description: 'Performing status — performing | watch | non_performing' },
      { name: 'seniority',           type: 'TEXT',      privacy: 'dimension', description: 'senior | mezz | sub | equity' },
      { name: 'secured',             type: 'BOOLEAN',   privacy: 'select',    description: 'True if secured by collateral' },
      { name: 'collateral_type',     type: 'TEXT',      privacy: 'dimension', description: 'RE | current_assets | IP | equipment | none' },
      { name: 'industry_code',       type: 'TEXT',      privacy: 'dimension', description: 'NAICS 2-digit industry classification code' },
      { name: 'borrower_country',    type: 'TEXT',      privacy: 'dimension', description: 'ISO-3166 alpha-2 country code of the obligor' },
      { name: 'borrower_msa',        type: 'TEXT',      privacy: 'private',   description: 'US Metropolitan Statistical Area — too granular to expose' },
      { name: 'originator_lender',   type: 'TEXT',      privacy: 'dimension', description: 'Originator — Apollo | club | syndicate name' },
      { name: 'vintage_year',        type: 'NUMERIC',   privacy: 'dimension', description: 'Origination year — usable in GROUP BY' },
      { name: 'origination_date',    type: 'TIMESTAMP', privacy: 'aggregate', description: 'Loan origination date — aggregate only', kMin: 5 },
      { name: 'maturity_date',       type: 'TIMESTAMP', privacy: 'aggregate', description: 'Loan maturity date — aggregate only', kMin: 5 },
      { name: 'wam_months',          type: 'NUMERIC',   privacy: 'select',    description: 'Computed weighted-average maturity in months' },
      { name: 'reference_rate',      type: 'TEXT',      privacy: 'dimension', description: 'SOFR | SONIA | EURIBOR | FIXED' },
      { name: 'spread_bps',          type: 'NUMERIC',   privacy: 'aggregate', description: 'Margin over reference rate in basis points', kMin: 5 },
      { name: 'all_in_rate_bps',     type: 'NUMERIC',   privacy: 'aggregate', description: 'All-in coupon yield in basis points', kMin: 5 },
      { name: 'floor_bps',           type: 'NUMERIC',   privacy: 'select',    description: 'SOFR / index floor in basis points' },
      { name: 'coupon_rate',         type: 'NUMERIC',   privacy: 'aggregate', description: 'Current coupon rate as a decimal', kMin: 50 },
      { name: 'pik_pct',             type: 'NUMERIC',   privacy: 'aggregate', description: 'Payment-in-kind portion of coupon', kMin: 5 },
      { name: 'par_value',           type: 'NUMERIC',   privacy: 'aggregate', description: 'Face / par value of the position in USD — SUM / COUNT only', kMin: 50 },
      { name: 'commitment_par',      type: 'NUMERIC',   privacy: 'aggregate', description: 'Total committed facility size — SUM only', kMin: 50 },
      { name: 'funded_par',          type: 'NUMERIC',   privacy: 'aggregate', description: 'Drawn balance — SUM only', kMin: 50 },
      { name: 'unfunded_par',        type: 'NUMERIC',   privacy: 'aggregate', description: 'Unfunded commitment — SUM only', kMin: 50 },
      { name: 'fair_value',          type: 'NUMERIC',   privacy: 'aggregate', description: 'ASC 820 fair value mark — SUM only', kMin: 50 },
      { name: 'cost_basis',          type: 'NUMERIC',   privacy: 'private',   description: 'Original cost basis — blocked (tax / IRR analysis only)' },
      { name: 'pct_net_assets',      type: 'NUMERIC',   privacy: 'aggregate', description: 'Position as % of NAV (10-Q SOI required field)', kMin: 5 },
      { name: 'ltv_band',            type: 'TEXT',      privacy: 'dimension', description: 'LTV bucket — <50% | 50-65% | 65-75% | 75-85% | >85%' },
      { name: 'ltv_ratio',           type: 'NUMERIC',   privacy: 'aggregate', description: 'Precise LTV — aggregate only; row-level use ltv_band', kMin: 5 },
      { name: 'loan_to_ebitda_x',    type: 'NUMERIC',   privacy: 'aggregate', description: 'Leverage multiple', kMin: 5 },
      { name: 'interest_coverage_x', type: 'NUMERIC',   privacy: 'aggregate', description: 'EBITDA / interest expense', kMin: 5 },
      { name: 'internal_rating',     type: 'TEXT',      privacy: 'dimension', description: 'Apollo internal rating 1–5' },
      { name: 'external_rating',     type: 'TEXT',      privacy: 'dimension', description: 'S&P-equivalent rating where assigned' },
      { name: 'non_accrual',         type: 'BOOLEAN',   privacy: 'aggregate', description: 'Non-accrual flag — required SOI footnote; aggregate share only', kMin: 5 },
      { name: 'restructured',        type: 'BOOLEAN',   privacy: 'aggregate', description: 'Restructured flag — required SOI footnote; aggregate share only', kMin: 5 },
      { name: 'covenants_loose',     type: 'BOOLEAN',   privacy: 'aggregate', description: 'Cov-lite flag — aggregate share only', kMin: 5 },
      { name: 'default_status',      type: 'TEXT',      privacy: 'dimension', description: 'performing | watchlist | default | restructure' },
      { name: 'last_payment_date',   type: 'TIMESTAMP', privacy: 'private',   description: 'Most recent payment date — blocked' },
      { name: 'pricing_source',      type: 'TEXT',      privacy: 'dimension', description: 'model | houlihan | dlx | lincoln | dealer' },
      { name: 'pricing_level',       type: 'TEXT',      privacy: 'dimension', description: 'ASC 820 Level — L1 | L2 | L3' },
      { name: 'is_affiliated',       type: 'BOOLEAN',   privacy: 'select',    description: 'Related-party flag (SOI footnote requirement)' },
    ],
  },

  // ─── 4 ─ position_pricing (Family 3) ─────────────────────────────────────
  {
    name: 'position_pricing',
    description: 'Daily ASC 820 Level 3 pricing marks per position from third-party private-credit valuation providers. One row per (position, mark_date).',
    refreshCadence: 'daily',
    lineageHint: 'Houlihan Lokey · Lincoln Intl. · DLx → vault',
    fields: [
      { name: 'position_id',                  type: 'TEXT',      privacy: 'join',      description: 'Position identifier — match key only' },
      { name: 'mark_date',                    type: 'TIMESTAMP', privacy: 'select',    description: 'Pricing mark date' },
      { name: 'bid',                          type: 'NUMERIC',   privacy: 'aggregate', description: 'Bid mark', kMin: 5 },
      { name: 'mid',                          type: 'NUMERIC',   privacy: 'aggregate', description: 'Mid mark', kMin: 5 },
      { name: 'offer',                        type: 'NUMERIC',   privacy: 'aggregate', description: 'Offer mark', kMin: 5 },
      { name: 'price_change_bps',             type: 'NUMERIC',   privacy: 'aggregate', description: 'Period-over-period price change in basis points', kMin: 5 },
      { name: 'valuation_committee_approved', type: 'BOOLEAN',   privacy: 'select',    description: 'Apollo valuation committee approval flag' },
      { name: 'third_party_provider',         type: 'TEXT',      privacy: 'dimension', description: 'Houlihan Lokey | Lincoln Intl. | DLx | other' },
      { name: 'pricing_level',                type: 'TEXT',      privacy: 'dimension', description: 'ASC 820 Level — L1 | L2 | L3' },
    ],
  },

  // ─── 5 ─ cash_positions (Family 2) ───────────────────────────────────────
  {
    name: 'cash_positions',
    description:
      'Cash on hand + daily flow events + pending redemption queue, unified by `record_type`. Cash sweep is hourly; flows are every 15m; redemption events are real-time.',
    refreshCadence: 'every 15m',
    lineageHint: 'BNY Mellon custody (cash) · Securitize investor portal events (flows) → vault',
    fields: [
      { name: 'record_type',               type: 'TEXT',      privacy: 'dimension', description: 'Row grain — cash_balance | flow | redemption' },
      // Cash balance grain
      { name: 'as_of',                     type: 'TIMESTAMP', privacy: 'select',    description: 'Balance / event as-of timestamp' },
      { name: 'currency',                  type: 'TEXT',      privacy: 'dimension', description: 'ISO 4217 currency code or stablecoin symbol' },
      { name: 'custodian',                 type: 'TEXT',      privacy: 'dimension', description: 'BNY Mellon | Anchorage Digital | State Street' },
      { name: 'account_type',              type: 'TEXT',      privacy: 'dimension', description: 'Account purpose — operating | subscription | redemption | escrow' },
      { name: 'balance',                   type: 'NUMERIC',   privacy: 'aggregate', description: 'Cash balance in stated currency', kMin: 1 },
      { name: 'balance_usd_equiv',         type: 'NUMERIC',   privacy: 'aggregate', description: 'USD-equivalent balance at as_of FX rate', kMin: 1 },
      // Flow grain
      { name: 'flow_date',                 type: 'TIMESTAMP', privacy: 'select',    description: 'Flow effective date' },
      { name: 'flow_type',                 type: 'TEXT',      privacy: 'dimension', description: 'subscription | redemption | distribution_income | distribution_return_of_capital | pik_accrual' },
      { name: 'class_id',                  type: 'TEXT',      privacy: 'dimension', description: 'Share class identifier' },
      { name: 'investor_tier',             type: 'TEXT',      privacy: 'dimension', description: 'institutional | accredited | defi_wrapper (sACRED)' },
      { name: 'gross_amount_usd',          type: 'NUMERIC',   privacy: 'aggregate', description: 'Gross flow amount — aggregate across investors', kMin: 5 },
      { name: 'share_count',               type: 'NUMERIC',   privacy: 'aggregate', description: 'Number of shares created / redeemed', kMin: 5 },
      // Redemption queue grain
      { name: 'redemption_id',             type: 'TEXT',      privacy: 'join',      description: 'Redemption request identifier — match key only' },
      { name: 'investor_id',               type: 'TEXT',      privacy: 'private',   description: 'Investor identifier — PII, blocked' },
      { name: 'requested_at',              type: 'TIMESTAMP', privacy: 'aggregate', description: 'Request submission timestamp', kMin: 25 },
      { name: 'amount_usd',                type: 'NUMERIC',   privacy: 'aggregate', description: 'Per-row redemption amount', kMin: 25 },
      { name: 'status',                    type: 'TEXT',      privacy: 'dimension', description: 'pending | processing | settled | cancelled' },
      { name: 'estimated_settlement_date', type: 'TIMESTAMP', privacy: 'select',    description: 'Projected settlement date for the request' },
      { name: 'next_cycle_at',             type: 'TIMESTAMP', privacy: 'select',    description: 'Timestamp of the next redemption settlement cycle' },
      { name: 'oldest_at',                 type: 'TIMESTAMP', privacy: 'select',    description: 'Timestamp of the oldest pending redemption request' },
      { name: 'pending_usd',               type: 'NUMERIC',   privacy: 'select',    description: 'Total USD value of pending redemption requests at as_of' },
      { name: 'holder_count',              type: 'NUMERIC',   privacy: 'aggregate', description: 'Number of distinct holders with pending requests', kMin: 25 },
    ],
  },

  // ─── 6 ─ capital_accounts (Family 2) ─────────────────────────────────────
  {
    name: 'capital_accounts',
    description: 'ILPA Reporting Template v2.0 quarterly capital account rollup — investor-tier aggregates only, never individual investor.',
    refreshCadence: 'quarterly',
    lineageHint: 'SS&C · ILPA template v2.0 quarterly delivery → vault',
    fields: [
      { name: 'as_of',                        type: 'TIMESTAMP', privacy: 'select',    description: 'Period-end date' },
      { name: 'investor_tier',                type: 'TEXT',      privacy: 'dimension', description: 'Investor classification tier — institutional | accredited | defi_wrapper' },
      { name: 'beginning_balance',            type: 'NUMERIC',   privacy: 'aggregate', description: 'Tier beginning balance', kMin: 10 },
      { name: 'contributions',                type: 'NUMERIC',   privacy: 'aggregate', description: 'Capital contributions during period', kMin: 10 },
      { name: 'distributions_recallable',     type: 'NUMERIC',   privacy: 'aggregate', description: 'Recallable distributions during period', kMin: 10 },
      { name: 'distributions_non_recallable', type: 'NUMERIC',   privacy: 'aggregate', description: 'Non-recallable distributions during period', kMin: 10 },
      { name: 'mgmt_fee_charged',             type: 'NUMERIC',   privacy: 'aggregate', description: 'Management fee charged to tier', kMin: 10 },
      { name: 'realized_gain_loss',           type: 'NUMERIC',   privacy: 'aggregate', description: 'Realized P&L allocated to tier', kMin: 10 },
      { name: 'unrealized_gain_loss',         type: 'NUMERIC',   privacy: 'aggregate', description: 'Unrealized P&L allocated to tier', kMin: 10 },
      { name: 'ending_balance',               type: 'NUMERIC',   privacy: 'aggregate', description: 'Tier ending balance', kMin: 10 },
    ],
  },

  // ─── 7 ─ risk_pack (Family 4) ────────────────────────────────────────────
  {
    name: 'risk_pack',
    description:
      'Pre-aggregated derived analytics — concentration (top-N + HHI), portfolio risk statistics (WAL / WAS / durations), rating-bucket distribution, and vintage-cohort summary, unified by `record_type`. Built nightly for counterparty consumption.',
    refreshCadence: 'daily',
    lineageHint: 'Derived nightly from loan_tape',
    fields: [
      { name: 'record_type',              type: 'TEXT',      privacy: 'dimension', description: 'Row grain — portfolio | rating_bucket | vintage_cohort' },
      { name: 'as_of',                    type: 'TIMESTAMP', privacy: 'select',    description: 'As-of date' },
      // Concentration (portfolio grain)
      { name: 'top_1_borrower_pct',       type: 'NUMERIC',   privacy: 'select',    description: 'Top single-borrower exposure as % of NAV (anonymized)' },
      { name: 'top_5_borrower_pct',       type: 'NUMERIC',   privacy: 'select',    description: 'Top-5 borrower exposure as % of NAV' },
      { name: 'top_10_borrower_pct',      type: 'NUMERIC',   privacy: 'select',    description: 'Top-10 borrower exposure as % of NAV' },
      { name: 'largest_industry_pct',     type: 'NUMERIC',   privacy: 'select',    description: 'Largest industry exposure as % of NAV' },
      { name: 'industry_hhi',             type: 'NUMERIC',   privacy: 'select',    description: 'Herfindahl-Hirschman index by industry (0–10,000)' },
      { name: 'geographic_hhi',           type: 'NUMERIC',   privacy: 'select',    description: 'HHI by borrower country' },
      { name: 'non_accrual_pct',          type: 'NUMERIC',   privacy: 'select',    description: 'Non-accrual exposure as % of fair value' },
      { name: 'pik_pct',                  type: 'NUMERIC',   privacy: 'select',    description: 'PIK exposure as % of par' },
      { name: 'cov_lite_pct',             type: 'NUMERIC',   privacy: 'select',    description: 'Covenant-lite share as % of par' },
      { name: 'floating_rate_pct',        type: 'NUMERIC',   privacy: 'select',    description: 'Floating-rate share as % of par' },
      // Risk statistics (portfolio grain)
      { name: 'wal_years',                type: 'NUMERIC',   privacy: 'select',    description: 'Weighted average life in years' },
      { name: 'was_bps',                  type: 'NUMERIC',   privacy: 'select',    description: 'Weighted average spread in basis points' },
      { name: 'war_bps',                  type: 'NUMERIC',   privacy: 'select',    description: 'Weighted average rate in basis points' },
      { name: 'wac_bps',                  type: 'NUMERIC',   privacy: 'select',    description: 'Weighted average coupon in basis points' },
      { name: 'modified_duration',        type: 'NUMERIC',   privacy: 'select',    description: 'Modified duration in years' },
      { name: 'spread_duration',          type: 'NUMERIC',   privacy: 'select',    description: 'Spread duration in years' },
      { name: 'weighted_internal_rating', type: 'NUMERIC',   privacy: 'select',    description: 'Par-weighted internal rating (1–5)' },
      { name: 'pct_default_or_watchlist', type: 'NUMERIC',   privacy: 'select',    description: 'Share of par in default or watchlist status' },
      // Rating distribution (rating_bucket grain)
      { name: 'rating_bucket',            type: 'TEXT',      privacy: 'dimension', description: 'Rating bucket — AAA..D | NR | internal_1..5' },
      { name: 'position_count',           type: 'NUMERIC',   privacy: 'aggregate', description: 'Number of positions in this bucket', kMin: 5 },
      { name: 'pct_fair_value',           type: 'NUMERIC',   privacy: 'select',    description: 'Bucket share of fair value' },
      { name: 'pct_par',                  type: 'NUMERIC',   privacy: 'select',    description: 'Bucket share of par' },
      // Vintage cohort (vintage_cohort grain)
      { name: 'vintage_year',             type: 'NUMERIC',   privacy: 'select',    description: 'Origination year of the cohort' },
      { name: 'total_par',                type: 'NUMERIC',   privacy: 'select',    description: 'Total par of performing positions in the vintage' },
      { name: 'wac',                      type: 'NUMERIC',   privacy: 'select',    description: 'Weighted average coupon across the vintage' },
      { name: 'default_rate_ytd',         type: 'NUMERIC',   privacy: 'select',    description: 'Year-to-date default rate (fraction)' },
      { name: 'recovery_rate_avg',        type: 'NUMERIC',   privacy: 'select',    description: 'Average recovery rate on defaulted positions in this vintage' },
    ],
  },

  // ─── 8 ─ accounting_ledger (Family 5) ────────────────────────────────────
  {
    name: 'accounting_ledger',
    description:
      'Typed-account general ledger (assets, liabilities, equity, gains, losses, expenses, income) at daily trial-balance grain, plus the ILPA v2.0 fee and expense categories and derived cash-flow summary (net_interest_income / total_obligations).',
    refreshCadence: 'daily · quarterly',
    lineageHint: 'SS&C · Allvue fund accounting → daily trial balance + ILPA quarterly → vault',
    fields: [
      { name: 'record_type',         type: 'TEXT',      privacy: 'dimension', description: 'Row grain — ledger | fee | cash_flow_summary' },
      // Trial balance grain
      { name: 'as_of',               type: 'TIMESTAMP', privacy: 'select',    description: 'Posting date' },
      { name: 'account_type',        type: 'TEXT',      privacy: 'dimension', description: 'asset | liability | equity | gain | loss | expense | income' },
      { name: 'account_subtype',     type: 'TEXT',      privacy: 'dimension', description: 'loans_at_fv | cash | accrued_interest | mgmt_fee_payable | subscription_payable | nav | …' },
      { name: 'balance',             type: 'NUMERIC',   privacy: 'aggregate', description: 'Account balance', kMin: 1 },
      { name: 'currency',            type: 'TEXT',      privacy: 'dimension', description: 'ISO 4217 currency code' },
      // ILPA fees grain
      { name: 'period',              type: 'TEXT',      privacy: 'dimension', description: 'Reporting period — 2026Q1 | 2026Q2 | …' },
      { name: 'category',            type: 'TEXT',      privacy: 'dimension', description: 'mgmt_fee | carried_interest_accrued | carried_interest_realized | placement_fee | offering_syndication_costs | third_party_valuations | external_partnership_expenses | subscription_line_interest | investigation_examination_fees | partner_transfers | fund_admin | audit_tax | legal' },
      { name: 'amount_usd',          type: 'NUMERIC',   privacy: 'aggregate', description: 'Period amount in USD', kMin: 1 },
      { name: 'paid_to_affiliate',   type: 'BOOLEAN',   privacy: 'select',    description: 'Whether the recipient is an affiliate of the manager (ILPA disclosure)' },
      // Cash-flow summary grain (DSCR support)
      { name: 'net_interest_income', type: 'NUMERIC',   privacy: 'aggregate', description: 'Period net interest income (revenue minus interest expense)', kMin: 1 },
      { name: 'total_obligations',   type: 'NUMERIC',   privacy: 'aggregate', description: 'Period total obligations (interest + principal due)', kMin: 1 },
    ],
  },

  // ─── 9 ─ reference_data (Family 6) ───────────────────────────────────────
  {
    name: 'reference_data',
    description:
      'Static reference data — borrower master, GICS 4-level industry taxonomy, CUSIP / ISIN instrument identifiers — unified by `record_type`. Borrower identity fields are private; classification and lookup fields are open.',
    refreshCadence: 'on change',
    lineageHint: 'Apollo origination · GICS · Bloomberg static reference → vault',
    fields: [
      { name: 'record_type',     type: 'TEXT',    privacy: 'dimension', description: 'Row grain — borrower | industry | instrument' },
      // Borrower grain
      { name: 'borrower_id',     type: 'TEXT',    privacy: 'join',      description: 'Synthetic borrower identifier — match key only' },
      { name: 'legal_name',      type: 'TEXT',    privacy: 'private',   description: 'Borrower legal name — blocked at ingest' },
      { name: 'lei',             type: 'TEXT',    privacy: 'private',   description: 'Legal Entity Identifier — blocked at ingest' },
      { name: 'industry_gics',   type: 'TEXT',    privacy: 'dimension', description: 'GICS industry — usable in GROUP BY' },
      { name: 'country',         type: 'TEXT',    privacy: 'dimension', description: 'ISO-3166 alpha-2 country code' },
      { name: 'is_sponsored',    type: 'BOOLEAN', privacy: 'select',    description: 'PE-sponsored vs founder / family-owned' },
      { name: 'sponsor_tier',    type: 'TEXT',    privacy: 'dimension', description: 'tier_1_megafund | mid_market | lower_mm | non_sponsored' },
      // Industry grain (GICS)
      { name: 'gics_code',       type: 'TEXT',    privacy: 'select',    description: 'GICS 8-digit code' },
      { name: 'sector',          type: 'TEXT',    privacy: 'select',    description: 'GICS Level 1 sector' },
      { name: 'industry_group',  type: 'TEXT',    privacy: 'select',    description: 'GICS Level 2 industry group' },
      { name: 'industry',        type: 'TEXT',    privacy: 'select',    description: 'GICS Level 3 industry' },
      { name: 'sub_industry',    type: 'TEXT',    privacy: 'select',    description: 'GICS Level 4 sub-industry' },
      // Instrument grain
      { name: 'cusip',           type: 'TEXT',    privacy: 'select',    description: 'CUSIP identifier' },
      { name: 'isin',            type: 'TEXT',    privacy: 'select',    description: 'ISIN identifier' },
      { name: 'instrument_name', type: 'TEXT',    privacy: 'select',    description: 'Tranche / instrument name' },
      { name: 'instrument_type', type: 'TEXT',    privacy: 'dimension', description: 'Tranche classification' },
      { name: 'currency',        type: 'TEXT',    privacy: 'dimension', description: 'ISO 4217 currency code' },
    ],
  },
]

// ── ACRED Templates ───────────────────────────────────────────────────────────

const ACRED_TEMPLATES: VaultTemplate[] = [
  {
    id: 'acred_tmpl_advance_rate',
    name: 'Advance rate (basic)',
    description: 'NAV × collateral coverage ratio with a 0.85 cap.',
    privacyMix: ['select', 'aggregate'],
    code: `-- Advance rate (basic)
-- NAV-weighted advance rate with 0.85 cap
WITH nav AS (
  SELECT aum_usd, as_of
  FROM vault.acred.nav_history
  ORDER BY as_of DESC
  LIMIT 1
),
collateral AS (
  SELECT SUM(par_value) AS total_par
  FROM vault.acred.loan_tape
  WHERE status = 'performing'
)
SELECT
  least(0.85, collateral.total_par * 0.90 / nav.aum_usd) AS advance_rate,
  nav.as_of AS as_of
FROM nav, collateral;`,
  },
  {
    id: 'acred_tmpl_nav_freshness',
    name: 'NAV freshness guard',
    description: 'Alerts if as_of falls behind expected cadence.',
    privacyMix: ['select'],
    code: `-- NAV freshness guard
-- Raises freshness flag if the most recent strike is stale
WITH latest AS (
  SELECT as_of, aum_usd
  FROM vault.acred.nav_history
  ORDER BY as_of DESC LIMIT 1
)
SELECT
  CASE
    WHEN extract(epoch FROM (now() - as_of)) < 3600  THEN 'fresh'
    WHEN extract(epoch FROM (now() - as_of)) < 86400 THEN 'stale'
    ELSE 'critical'
  END                                                  AS freshness,
  as_of,
  extract(epoch FROM (now() - as_of))::int             AS age_seconds,
  aum_usd                                              AS current_nav
FROM latest;`,
  },
  {
    id: 'acred_tmpl_concentration_vintage',
    name: 'Concentration by vintage',
    description: 'GROUP BY vintage_year, SUM par for performing positions.',
    privacyMix: ['dimension', 'aggregate'],
    code: `-- Concentration by vintage
-- Groups performing positions by origination year
SELECT
  vintage_year,
  SUM(par_value)  AS total_par,
  COUNT(*)        AS position_count
FROM vault.acred.loan_tape
WHERE status = 'performing'
GROUP BY vintage_year
ORDER BY vintage_year DESC;`,
  },
  {
    id: 'acred_tmpl_ltv_band',
    name: 'LTV band distribution',
    description: 'GROUP BY ltv_band, count and sum par value.',
    privacyMix: ['dimension', 'aggregate'],
    code: `-- LTV band distribution
-- Counts and par exposure by LTV tier bucket
SELECT
  ltv_band,
  COUNT(*)        AS position_count,
  SUM(par_value)  AS total_par
FROM vault.acred.loan_tape
WHERE status = 'performing'
GROUP BY ltv_band
ORDER BY ltv_band;`,
  },
  {
    id: 'acred_tmpl_default_rate_30d',
    name: 'Default-rate rolling 30d',
    description: 'Vintage default rates over a rolling 30-day window.',
    privacyMix: ['select'],
    code: `-- Default-rate rolling 30d
-- Vintage-level default rates from the risk_pack vintage_cohort rows
SELECT
  vintage_year,
  default_rate_ytd,
  recovery_rate_avg,
  total_par,
  position_count
FROM vault.acred.risk_pack
WHERE record_type = 'vintage_cohort'
ORDER BY default_rate_ytd DESC;`,
  },

  // ─── Killer-demo templates — Gauntlet's sACRED parameter loop ────────────
  //
  // The next 8 templates mirror the production queries a DeFi risk team
  // (Gauntlet, sACRED, April 2026 launch) runs against a tokenized private
  // credit fund to set Morpho-style market parameters. Each maps to a
  // specific risk decision the counterparty has to make.
  {
    id: 'acred_tmpl_top_borrower_concentration',
    name: 'Top-N borrower concentration',
    description: 'Reads the pre-aggregated risk_pack portfolio row; flags single-name cap breach.',
    privacyMix: ['select', 'aggregate'],
    code: `-- Top-N borrower concentration  (Morpho single-name cap input)
-- Pulls pre-aggregated top_N exposure from the risk_pack and pairs
-- with the latest NAV strike to compute nominal $ exposures.
WITH risk AS (
  SELECT
    top_1_borrower_pct,
    top_5_borrower_pct,
    top_10_borrower_pct,
    industry_hhi
  FROM vault.acred.risk_pack
  WHERE record_type = 'portfolio'
  ORDER BY as_of DESC LIMIT 1
),
nav AS (
  SELECT aum_usd
  FROM vault.acred.nav_history
  ORDER BY as_of DESC LIMIT 1
)
SELECT
  risk.top_1_borrower_pct,
  risk.top_5_borrower_pct,
  risk.top_10_borrower_pct,
  risk.industry_hhi,
  risk.top_1_borrower_pct * nav.aum_usd  AS top_1_exposure_usd,
  risk.top_1_borrower_pct > 0.05         AS breaches_single_name_cap
FROM risk, nav;`,
  },
  {
    id: 'acred_tmpl_industry_hhi_breach',
    name: 'Industry / geographic HHI breach',
    description: 'Herfindahl regime classification — alerts when sector or geo concentration crosses thresholds.',
    privacyMix: ['select'],
    code: `-- Industry & geographic Herfindahl-Hirschman regime
-- Bands match DOJ HHI guidance: <1500 diversified, 1500-2500 moderate, >2500 concentrated.
SELECT
  as_of,
  industry_hhi,
  geographic_hhi,
  largest_industry_pct,
  CASE
    WHEN industry_hhi > 2500 THEN 'concentrated'
    WHEN industry_hhi > 1500 THEN 'moderate'
    ELSE 'diversified'
  END AS industry_regime,
  CASE
    WHEN geographic_hhi > 2500 THEN 'concentrated'
    WHEN geographic_hhi > 1500 THEN 'moderate'
    ELSE 'diversified'
  END AS geographic_regime
FROM vault.acred.risk_pack
WHERE record_type = 'portfolio'
ORDER BY as_of DESC LIMIT 1;`,
  },
  {
    id: 'acred_tmpl_collateral_quality_score',
    name: 'Collateral quality score',
    description: 'Par-weighted share of non-accrual, restructured, and cov-lite positions across the book.',
    privacyMix: ['aggregate'],
    code: `-- Collateral quality score  (composite quality KPI for the fund)
-- Higher = lower quality. Each share is kMin-protected.
SELECT
  SUM(par_value)                                                       AS total_par,
  SUM(par_value) FILTER (WHERE non_accrual    = true)  / SUM(par_value) AS non_accrual_share,
  SUM(par_value) FILTER (WHERE restructured   = true)  / SUM(par_value) AS restructured_share,
  SUM(par_value) FILTER (WHERE covenants_loose = true) / SUM(par_value) AS cov_lite_share,
  COUNT(*)                                                              AS position_count
FROM vault.acred.loan_tape
WHERE status IN ('performing', 'watch');`,
  },
  {
    id: 'acred_tmpl_stress_lltv',
    name: 'Stress-test LLTV (Morpho)',
    description: 'Liquidation-LTV recommendation with a 5% NAV haircut and senior-eligible collateral filter.',
    privacyMix: ['select', 'aggregate'],
    code: `-- Stress-test LLTV  (Morpho market parameter setter)
-- Applies a 5% NAV haircut and restricts collateral to senior-secured / first-lien
-- performing positions, then caps the recommended LLTV at 0.70.
WITH nav AS (
  SELECT aum_usd
  FROM vault.acred.nav_history
  ORDER BY as_of DESC LIMIT 1
),
collateral AS (
  SELECT
    SUM(fair_value)                                       AS total_fv,
    SUM(fair_value) FILTER (WHERE default_status = 'performing'
                              AND asset_class IN ('senior_secured_loan', 'first_lien'))
                                                          AS eligible_fv
  FROM vault.acred.loan_tape
),
stressed AS (
  SELECT aum_usd * 0.95 AS stressed_nav FROM nav
)
SELECT
  nav.aum_usd                                              AS current_nav,
  stressed.stressed_nav                                    AS stressed_nav_5pct,
  collateral.eligible_fv                                   AS eligible_collateral,
  least(
    0.70,
    collateral.eligible_fv * 0.85 / stressed.stressed_nav
  )                                                        AS recommended_lltv
FROM nav, collateral, stressed;`,
  },
  {
    id: 'acred_tmpl_redemption_pressure',
    name: 'Redemption pressure vs cash',
    description: 'Pending redemption queue compared against operating-cash buffer; classifies liquidity regime.',
    privacyMix: ['aggregate', 'dimension'],
    code: `-- Redemption pressure  (gating-risk early warning)
-- A high ratio means redemption requests are approaching the operating
-- cash buffer — fund may need to draw subscription line or gate exits.
WITH pending AS (
  SELECT
    SUM(amount_usd)                  AS pending_usd,
    MIN(requested_at)                AS oldest_request,
    COUNT(DISTINCT redemption_id)    AS request_count
  FROM vault.acred.cash_positions
  WHERE record_type = 'redemption'
    AND status      = 'pending'
),
cash AS (
  SELECT SUM(balance_usd_equiv) AS operating_cash_usd
  FROM vault.acred.cash_positions
  WHERE record_type   = 'cash_balance'
    AND account_type  = 'operating'
)
SELECT
  pending.pending_usd,
  pending.request_count,
  pending.oldest_request,
  cash.operating_cash_usd,
  pending.pending_usd / nullif(cash.operating_cash_usd, 0) AS pressure_ratio,
  CASE
    WHEN pending.pending_usd > cash.operating_cash_usd        THEN 'gated_risk'
    WHEN pending.pending_usd > cash.operating_cash_usd * 0.5  THEN 'monitor'
    ELSE 'covered'
  END                                                        AS regime
FROM pending, cash;`,
  },
  {
    id: 'acred_tmpl_dscr_coverage',
    name: 'DSCR coverage trend',
    description: 'Debt-service coverage ratio over trailing quarters with regime classification.',
    privacyMix: ['aggregate', 'dimension'],
    code: `-- Debt-service coverage ratio  (trailing 4 quarters)
-- DSCR < 1.0 means net interest income won't cover obligations — covenant trigger.
SELECT
  period,
  net_interest_income,
  total_obligations,
  net_interest_income / nullif(total_obligations, 0) AS dscr,
  CASE
    WHEN net_interest_income / nullif(total_obligations, 0) >= 1.5 THEN 'strong'
    WHEN net_interest_income / nullif(total_obligations, 0) >= 1.1 THEN 'adequate'
    ELSE 'tight'
  END                                                AS coverage_regime
FROM vault.acred.accounting_ledger
WHERE record_type = 'cash_flow_summary'
  AND period >= date_trunc('quarter', now()) - interval '4 quarters'
ORDER BY period DESC;`,
  },
  {
    id: 'acred_tmpl_pik_creep',
    name: 'PIK creep by vintage',
    description: 'Weighted PIK share by vintage cohort — early-warning signal of borrower distress.',
    privacyMix: ['dimension', 'aggregate'],
    code: `-- PIK creep  (cash-pay → in-kind drift, vintage cohort view)
-- Rising weighted_pik_share in newer vintages signals adverse selection.
SELECT
  vintage_year,
  COUNT(*)                                              AS position_count,
  SUM(par_value)                                        AS vintage_par,
  AVG(pik_pct)                                          AS avg_pik_pct,
  SUM(par_value * pik_pct) / nullif(SUM(par_value), 0)  AS weighted_pik_share
FROM vault.acred.loan_tape
WHERE status IN ('performing', 'watch')
GROUP BY vintage_year
ORDER BY vintage_year DESC;`,
  },
  {
    id: 'acred_tmpl_attestation_freshness',
    name: 'TSSO attestation freshness',
    description: 'Confirms the most recent NAV strike is signed and chained; classifies freshness regime.',
    privacyMix: ['select', 'join'],
    code: `-- TSSO attestation freshness  (oracle integrity check)
-- Each row must have a non-null attestation_id chained to its predecessor.
-- A null id or > 24h staleness should fail the oracle gate.
SELECT
  as_of,
  attestation_id,
  aum_usd,
  nav_per_share,
  extract(epoch FROM (now() - as_of))::int AS age_seconds,
  CASE
    WHEN attestation_id IS NULL                       THEN 'unsigned'
    WHEN extract(epoch FROM (now() - as_of)) > 86400  THEN 'stale'
    WHEN extract(epoch FROM (now() - as_of)) > 7200   THEN 'late'
    ELSE 'fresh'
  END                                       AS attestation_regime
FROM vault.acred.nav_history
ORDER BY as_of DESC
LIMIT 5;`,
  },
]

const MAPLE_TABLES: VaultTable[] = [
  {
    name: 'pool_summary',
    description: 'Current state of the trade finance revolving credit pool.',
    refreshCadence: 'every 5m',
    lineageHint: 'Maple Finance pool state → vault',
    fields: [
      { name: 'total_committed_usd', type: 'NUMERIC',   privacy: 'select',    description: 'Total committed capital in the pool' },
      { name: 'deployed_usd',        type: 'NUMERIC',   privacy: 'select',    description: 'Currently deployed (outstanding loans)' },
      { name: 'utilization_rate',    type: 'NUMERIC',   privacy: 'select',    description: 'deployed / committed as a fraction' },
      { name: 'snapshot_at',         type: 'TIMESTAMP', privacy: 'select',    description: 'Snapshot UTC timestamp' },
      { name: 'wac',                 type: 'NUMERIC',   privacy: 'aggregate', description: 'Weighted average coupon of deployed loans — aggregate only' },
      { name: 'avg_tenor_days',      type: 'NUMERIC',   privacy: 'aggregate', description: 'Average loan tenor in days — aggregate only' },
    ],
  },
  {
    name: 'loan_book',
    description: 'Individual trade finance loan records.',
    refreshCadence: 'every 15m',
    lineageHint: 'Maple Finance loan state → vault',
    fields: [
      { name: 'loan_id',          type: 'TEXT',       privacy: 'join',      description: 'Deterministic-hashed loan identifier — match key only' },
      { name: 'principal_usd',    type: 'NUMERIC',    privacy: 'aggregate', description: 'Outstanding principal in USD — aggregate only' },
      { name: 'maturity_date',    type: 'TIMESTAMP',  privacy: 'dimension', description: 'Loan maturity date bucket — usable in GROUP BY' },
      { name: 'status',           type: 'TEXT',       privacy: 'dimension', description: 'Loan status: active | matured | defaulted' },
      { name: 'borrower_country', type: 'TEXT',       privacy: 'dimension', description: 'ISO 3166-1 alpha-2 country code of the borrower' },
      { name: 'borrower_name',    type: 'TEXT',       privacy: 'private',   description: 'Legal name of the borrowing entity — PII, blocked at ingest' },
    ],
  },
]

const BUIDL_TABLES: VaultTable[] = [
  {
    name: 'nav_latest',
    description: 'BUIDL fund NAV snapshot.',
    refreshCadence: 'daily',
    lineageHint: 'BlackRock fund admin → Securitize → vault',
    fields: [
      { name: 'current_nav',   type: 'NUMERIC',    privacy: 'select', description: 'Total fund NAV in USD' },
      { name: 'snapshot_at',   type: 'TIMESTAMP',  privacy: 'select', description: 'NAV as-of timestamp' },
      { name: 'nav_per_share', type: 'NUMERIC',    privacy: 'select', description: 'NAV per share — maintained near $1.00' },
      { name: 'shares_issued', type: 'NUMERIC',    privacy: 'select', description: 'Total shares outstanding' },
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
    schemaCount: 9,
    myAnalysisCount: 6,
    grantedAt: daysAgo(60),
    grantedBy: 'Sarah Chen',
    lastProviderUpdateAt: minsAgo(11),
    tables: ACRED_TABLES,
    accessibleOperations: ['join', 'aggregate', 'dimension', 'select'],
    templates: ACRED_TEMPLATES,
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
    tables: MAPLE_TABLES,
    accessibleOperations: ['join', 'aggregate', 'dimension', 'select'],
    templates: [],
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
    tables: BUIDL_TABLES,
    accessibleOperations: ['select'],
    templates: [],
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
