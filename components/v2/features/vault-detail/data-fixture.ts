/**
 * Data page fixture — sealed datasets inside ACRED-style vaults.
 * Each dataset combines: source connection + schema with field-level privacy
 * + ASC 820 fair-value classification + immutable seal history.
 */

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

/**
 * Privacy tier — the heart of the vault. Determines whether a field
 * leaves the vault, and in what shape.
 *
 *   on-chain   → hashes / references published on every block.
 *   queryable  → counterparties can run aggregate computations against it.
 *                Raw values never returned, only computed results.
 *   private    → sealed at ingest. Stays inside, no exception.
 */
export type PrivacyLevel = 'on-chain' | 'queryable' | 'private'

export type FieldType = 'string' | 'number' | 'currency' | 'percent' | 'date' | 'enum' | 'address' | 'bool' | 'hash'

export interface DatasetField {
  name: string
  type: FieldType
  privacy: PrivacyLevel
  /** Plain-language hint, e.g. "Borrower legal name" */
  description?: string
}

export type DatasetStatus = 'sealed' | 'pending' | 'failed'

/** ASC 820 fair value hierarchy. */
export type AscClass = 'L1' | 'L2' | 'L3'

export interface SealEvent {
  id: string
  at: string
  by: string
  records: number
  hash: string
}

export interface Dataset {
  id: string
  name: string
  source: string
  /** Source connector route (e.g. for "view source" links). */
  sourceId: string
  description: string
  status: DatasetStatus
  ascClass?: AscClass
  recordCount: number
  fieldCount: number
  /** Sampled schema. Real datasets have hundreds of fields; we show a
   *  representative slice. */
  fields: DatasetField[]
  lastSealedAt: string
  /** Last 3-6 seal events. */
  sealHistory: SealEvent[]
}

// ── Loanbook (Apollo PMS) ────────────────────────────────────────────────────

const loanbookFields: DatasetField[] = [
  { name: 'loan_id', type: 'string', privacy: 'on-chain', description: 'Internal loan reference (UUID).' },
  { name: 'asc_class', type: 'enum', privacy: 'on-chain', description: 'ASC 820 fair-value tier.' },
  { name: 'sealed_at_block', type: 'number', privacy: 'on-chain', description: 'Block height of the last seal.' },
  { name: 'borrower_did', type: 'string', privacy: 'private', description: 'Borrower decentralized identifier.' },
  { name: 'borrower_legal_name', type: 'string', privacy: 'private' },
  { name: 'industry_sector', type: 'enum', privacy: 'queryable', description: 'GICS sector (aggregatable).' },
  { name: 'facility_amount', type: 'currency', privacy: 'private' },
  { name: 'current_balance', type: 'currency', privacy: 'private' },
  { name: 'coupon_rate', type: 'percent', privacy: 'private' },
  { name: 'maturity_date', type: 'date', privacy: 'private' },
  { name: 'weighted_avg_yield', type: 'percent', privacy: 'queryable', description: 'Pre-computed aggregate.' },
  { name: 'concentration_pct', type: 'percent', privacy: 'queryable' },
  { name: 'non_accrual_flag', type: 'bool', privacy: 'queryable' },
  { name: 'last_payment_date', type: 'date', privacy: 'private' },
  { name: 'recovery_estimate', type: 'percent', privacy: 'private' },
]

// ── Holdings (BNY Mellon) ────────────────────────────────────────────────────

const holdingsFields: DatasetField[] = [
  { name: 'position_id', type: 'string', privacy: 'on-chain' },
  { name: 'as_of_date', type: 'date', privacy: 'on-chain' },
  { name: 'security_cusip', type: 'string', privacy: 'queryable' },
  { name: 'security_isin', type: 'string', privacy: 'queryable' },
  { name: 'asset_class', type: 'enum', privacy: 'queryable' },
  { name: 'quantity', type: 'number', privacy: 'private' },
  { name: 'cost_basis', type: 'currency', privacy: 'private' },
  { name: 'fair_value', type: 'currency', privacy: 'private' },
  { name: 'fair_value_aggregate', type: 'currency', privacy: 'queryable', description: 'Aggregated across positions.' },
  { name: 'unrealized_pnl', type: 'currency', privacy: 'private' },
  { name: 'custodian_account', type: 'string', privacy: 'private' },
  { name: 'segregation_flag', type: 'bool', privacy: 'private' },
]

// ── Pricing (Bloomberg BPIPE) ────────────────────────────────────────────────

const pricingFields: DatasetField[] = [
  { name: 'tick_id', type: 'hash', privacy: 'on-chain' },
  { name: 'as_of', type: 'date', privacy: 'on-chain' },
  { name: 'security_cusip', type: 'string', privacy: 'queryable' },
  { name: 'bid', type: 'currency', privacy: 'private' },
  { name: 'ask', type: 'currency', privacy: 'private' },
  { name: 'last', type: 'currency', privacy: 'queryable' },
  { name: 'mid_aggregate', type: 'currency', privacy: 'queryable', description: 'Volume-weighted mid.' },
  { name: 'volume', type: 'number', privacy: 'queryable' },
  { name: 'venue', type: 'enum', privacy: 'queryable' },
]

// ── NAV report (ALPS API) ────────────────────────────────────────────────────

const navFields: DatasetField[] = [
  { name: 'nav_total', type: 'currency', privacy: 'on-chain', description: 'Total NAV — published on-chain.' },
  { name: 'nav_per_share', type: 'currency', privacy: 'on-chain' },
  { name: 'shares_outstanding', type: 'number', privacy: 'on-chain' },
  { name: 'reporting_date', type: 'date', privacy: 'on-chain' },
  { name: 'gross_assets', type: 'currency', privacy: 'queryable' },
  { name: 'liabilities', type: 'currency', privacy: 'private' },
  { name: 'fee_accruals', type: 'currency', privacy: 'private' },
  { name: 'subscriptions', type: 'currency', privacy: 'private' },
]

// ── Borrower performance (manual) ────────────────────────────────────────────

const borrowerFields: DatasetField[] = [
  { name: 'borrower_did', type: 'string', privacy: 'private' },
  { name: 'reporting_period', type: 'date', privacy: 'on-chain' },
  { name: 'revenue', type: 'currency', privacy: 'private' },
  { name: 'ebitda', type: 'currency', privacy: 'private' },
  { name: 'leverage_ratio', type: 'number', privacy: 'private' },
  { name: 'interest_coverage', type: 'number', privacy: 'private' },
  { name: 'covenant_status', type: 'enum', privacy: 'queryable' },
  { name: 'covenant_headroom_pct', type: 'percent', privacy: 'queryable' },
  { name: 'risk_grade', type: 'enum', privacy: 'queryable' },
]

export const datasets: Dataset[] = [
  {
    id: 'loanbook',
    name: 'Loanbook',
    source: 'Apollo PMS',
    sourceId: 'apollo-pms',
    description:
      'Loan-level portfolio. Position management system feed — every facility, balance, and rate in the vault.',
    status: 'sealed',
    ascClass: 'L3',
    recordCount: 14_209,
    fieldCount: 847,
    fields: loanbookFields,
    lastSealedAt: minsAgo(11),
    sealHistory: [
      { id: 'lb-1', at: minsAgo(11), by: 'mark.t@securitize.io', records: 14_209, hash: '0x4e22…9bbc' },
      { id: 'lb-2', at: daysAgo(31), by: 'mark.t@securitize.io', records: 13_847, hash: '0x9a11…02fe' },
      { id: 'lb-3', at: daysAgo(62), by: 'mark.t@securitize.io', records: 13_512, hash: '0x2c08…77aa' },
      { id: 'lb-4', at: daysAgo(91), by: 'mark.t@securitize.io', records: 13_104, hash: '0x88f4…a103' },
    ],
  },
  {
    id: 'holdings',
    name: 'Holdings',
    source: 'BNY Mellon · SWIFT',
    sourceId: 'bny-custodian',
    description:
      'Custodian position snapshot. Daily SFTP drop with TLSNotary proof of provenance.',
    status: 'sealed',
    ascClass: 'L2',
    recordCount: 8_412,
    fieldCount: 412,
    fields: holdingsFields,
    lastSealedAt: minsAgo(8),
    sealHistory: [
      { id: 'h-1', at: minsAgo(8), by: 'bny.bot', records: 8_412, hash: '0x9c3a…f7b1' },
      { id: 'h-2', at: hoursAgo(24), by: 'bny.bot', records: 8_390, hash: '0xb1aa…cc70' },
      { id: 'h-3', at: hoursAgo(48), by: 'bny.bot', records: 8_372, hash: '0x7f88…21de' },
    ],
  },
  {
    id: 'pricing',
    name: 'Pricing marks',
    source: 'Bloomberg · BPIPE',
    sourceId: 'bloomberg-bpipe',
    description:
      'Intraday loan pricing marks. Facility-level bid/ask/last from active venues.',
    status: 'sealed',
    ascClass: 'L1',
    recordCount: 6_117,
    fieldCount: 184,
    fields: pricingFields,
    lastSealedAt: minsAgo(7),
    sealHistory: [
      { id: 'p-1', at: minsAgo(7), by: 'bbg.feed', records: 6_117, hash: '0x8af0…11dd' },
      { id: 'p-2', at: minsAgo(22), by: 'bbg.feed', records: 6_115, hash: '0x55a2…aa01' },
      { id: 'p-3', at: minsAgo(37), by: 'bbg.feed', records: 6_109, hash: '0x12cc…dd49' },
    ],
  },
  {
    id: 'nav-report',
    name: 'NAV report',
    source: 'ALPS API · fund admin',
    sourceId: 'alps-api',
    description:
      'Monthly NAV statement from the fund administrator. Total NAV, NAV per share, share count.',
    status: 'pending',
    ascClass: 'L3',
    recordCount: 1,
    fieldCount: 8,
    fields: navFields,
    lastSealedAt: hoursAgo(3),
    sealHistory: [
      { id: 'n-1', at: hoursAgo(3), by: 'admin@apollo.com', records: 1, hash: '0xb31a…02fe' },
      { id: 'n-2', at: daysAgo(31), by: 'admin@apollo.com', records: 1, hash: '0x6661…f8b0' },
      { id: 'n-3', at: daysAgo(62), by: 'admin@apollo.com', records: 1, hash: '0xa040…3210' },
    ],
  },
  {
    id: 'borrower-performance',
    name: 'Borrower performance',
    source: 'Manual · Apollo risk',
    sourceId: 'manual-risk',
    description:
      'Quarterly performance pack. Revenue, EBITDA, leverage, covenants — submitted by Apollo risk team.',
    status: 'sealed',
    ascClass: 'L3',
    recordCount: 487,
    fieldCount: 24,
    fields: borrowerFields,
    lastSealedAt: daysAgo(18),
    sealHistory: [
      { id: 'bp-1', at: daysAgo(18), by: 'risk@apollo.com', records: 487, hash: '0xff10…77aa' },
      { id: 'bp-2', at: daysAgo(108), by: 'risk@apollo.com', records: 481, hash: '0xee20…3322' },
    ],
  },
]

export function findDataset(id: string): Dataset | undefined {
  return datasets.find((d) => d.id === id)
}

/** Roll-up counts across every dataset — used by the vault policy panel. */
export interface VaultPolicySummary {
  totalFields: number
  onChain: number
  queryable: number
  private: number
  examples: Record<PrivacyLevel, string[]>
}

export function computeVaultPolicy(): VaultPolicySummary {
  let onChain = 0
  let queryable = 0
  let priv = 0
  const examples: Record<PrivacyLevel, string[]> = {
    'on-chain': [],
    queryable: [],
    private: [],
  }
  // Use the real total of each dataset (not just sampled fields) by
  // extrapolating from the sampled mix.
  let totalFields = 0
  for (const ds of datasets) {
    totalFields += ds.fieldCount
    const sampled = ds.fields
    const sampleSize = sampled.length || 1
    const byTier = { 'on-chain': 0, queryable: 0, private: 0 } as Record<PrivacyLevel, number>
    for (const f of sampled) byTier[f.privacy]++
    const scale = ds.fieldCount / sampleSize
    onChain += Math.round(byTier['on-chain'] * scale)
    queryable += Math.round(byTier.queryable * scale)
    priv += Math.round(byTier.private * scale)
    for (const f of sampled) {
      if (examples[f.privacy].length < 6) examples[f.privacy].push(f.name)
    }
  }
  return { totalFields, onChain, queryable, private: priv, examples }
}
