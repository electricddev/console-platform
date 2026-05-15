/**
 * Data page fixture — sealed datasets inside ACRED-style vaults.
 * Each dataset combines: source connection + schema with field-level privacy
 * + ASC 820 fair-value classification + immutable seal history.
 */

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()
const daysFromNow = (d: number) => new Date(NOW + d * 86_400_000).toISOString()

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

// ── Dataset config ───────────────────────────────────────────────────────────

export type SyncMethod = 'scheduled' | 'realtime' | 'manual' | 'api' | 'webhook'
export type SyncStatus = 'ok' | 'warn' | 'fail'
export type FreshnessThreshold = '1h' | '6h' | '24h' | '7d' | 'manual'
export type ValidationStatus = 'pass' | 'warn' | 'fail'

export interface ValidationRule {
  name: string
  description: string
  status: ValidationStatus
}

export interface DatasetConfig {
  syncMethod: SyncMethod
  /** Human-readable schedule string. */
  schedule: string
  lastSyncAt: string
  lastSyncStatus: SyncStatus
  /** ISO timestamp or null if manual / continuous. */
  nextSyncAt: string | null
  /** Last 8 sync attempts, newest last. */
  syncHistory: SyncStatus[]
  validationRules: ValidationRule[]
  freshnessThreshold: FreshnessThreshold
  notifications: {
    email: string[]
    webhook?: string
  }
}

export const datasetConfigs: Record<string, DatasetConfig> = {
  loanbook: {
    syncMethod: 'scheduled',
    schedule: 'Daily 06:00 ET',
    lastSyncAt: minsAgo(11),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(new Date().getHours() + 3, 14, 0, 0)).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Schema match', description: 'Inbound schema must match sealed schema v3', status: 'pass' },
      { name: 'Row count drift', description: '≤5% week-over-week', status: 'pass' },
      { name: 'Value range — facility_amount', description: '$0–$50M per facility', status: 'pass' },
      { name: 'PII column required-private', description: 'Borrower fields must be private', status: 'pass' },
      { name: 'Freshness window', description: 'Last sync ≤ 24 h', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['risk@apollo.com', 'mark.t@securitize.io'],
      webhook: 'https://hooks.securitize.io/hyve/loanbook',
    },
  },
  holdings: {
    syncMethod: 'scheduled',
    schedule: 'Daily 04:30 ET',
    lastSyncAt: minsAgo(8),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(new Date().getHours() + 20, 22, 0, 0)).toISOString(),
    syncHistory: ['ok', 'ok', 'warn', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Schema match', description: 'Inbound schema must match sealed schema v2', status: 'pass' },
      { name: 'Row count drift', description: '≤3% day-over-day', status: 'warn' },
      { name: 'Custodian account required-private', description: 'Account fields must be private', status: 'pass' },
      { name: 'Freshness window', description: 'Last sync ≤ 24 h', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['ops@bny.com', 'mark.t@securitize.io'],
    },
  },
  pricing: {
    syncMethod: 'realtime',
    schedule: 'Continuous',
    lastSyncAt: minsAgo(7),
    lastSyncStatus: 'ok',
    nextSyncAt: null,
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Tick schema match', description: 'Inbound tick must match BPIPE schema v1', status: 'pass' },
      { name: 'Bid-ask spread', description: 'Spread ≤ 200 bps', status: 'pass' },
      { name: 'Stale price guard', description: 'Tick age ≤ 15 min', status: 'pass' },
    ],
    freshnessThreshold: '1h',
    notifications: {
      email: ['feed@bloomberg.com', 'risk@apollo.com'],
      webhook: 'https://hooks.securitize.io/hyve/pricing',
    },
  },
  'nav-report': {
    syncMethod: 'api',
    schedule: 'Monthly (on-demand)',
    lastSyncAt: hoursAgo(3),
    lastSyncStatus: 'warn',
    nextSyncAt: null,
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'warn', 'warn'],
    validationRules: [
      { name: 'NAV reconciliation', description: 'Total NAV ± 0.5% vs prior period', status: 'warn' },
    ],
    freshnessThreshold: '7d',
    notifications: {
      email: ['admin@apollo.com', 'compliance@securitize.io'],
    },
  },
  'borrower-performance': {
    syncMethod: 'manual',
    schedule: 'On-demand',
    lastSyncAt: daysAgo(18),
    lastSyncStatus: 'ok',
    nextSyncAt: null,
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Schema match', description: 'CSV must match template v4', status: 'pass' },
      { name: 'Covenant status required', description: 'All rows must include covenant_status', status: 'pass' },
    ],
    freshnessThreshold: '7d',
    notifications: {
      email: ['risk@apollo.com'],
    },
  },
}

// ── Access & Templates types ─────────────────────────────────────────────────

export type TemplateStatus = 'live' | 'draft' | 'paused'
export type TemplateInputType = 'enum' | 'date' | 'number' | 'string'
export type GrantStatus = 'active' | 'paused' | 'expired'

export interface TemplateInput {
  name: string
  type: TemplateInputType
  required: boolean
}

export interface QueryTemplate {
  id: string
  name: string
  description: string
  inputs: TemplateInput[]
  /** Dataset fields this template reads. */
  fields: string[]
  /** Human description of what the result looks like. */
  resultShape: string
  privacy: {
    /** Minimum records per bucket, or null if not applicable. */
    aggregation: number | null
    differentialPrivacy: boolean
  }
  status: TemplateStatus
  runs7d: number
}

export interface CounterpartyGrant {
  counterparty: string
  templateIds: string[]
  rateLimit: string
  validFrom: string
  validUntil: string | null
  status: GrantStatus
  runs7d: number
  /** Human-readable relative timestamp of last query activity, e.g. "12s ago". */
  lastActivityAt?: string
}

/** Access posture for a dataset — privacy knobs + template catalog + grants. */
export interface DatasetAccess {
  privacyUnit: string | null
  aggregationThreshold: number | null
  dpBudget: number | null
  dpBudgetUsedPct: number | null
  templates: QueryTemplate[]
  grants: CounterpartyGrant[]
}

// ── Per-dataset access fixtures ───────────────────────────────────────────────

const loanbookAccess: DatasetAccess = {
  privacyUnit: 'borrower_did',
  aggregationThreshold: 5,
  dpBudget: 1.0,
  dpBudgetUsedPct: 42,
  templates: [
    {
      id: 'qt_concentration_by_sector',
      name: 'Concentration by sector',
      description: 'Returns weighted exposure by GICS sector with aggregation threshold enforcement.',
      inputs: [
        { name: 'as_of_date', type: 'date', required: true },
        { name: 'min_exposure_pct', type: 'number', required: false },
      ],
      fields: ['industry_sector', 'concentration_pct', 'weighted_avg_yield'],
      resultShape: 'Aggregate, 1 row per sector',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 38,
    },
    {
      id: 'qt_advance_rate_by_rating',
      name: 'Advance rate by rating',
      description: 'Average advance rate bucketed by credit rating class.',
      inputs: [
        { name: 'as_of_date', type: 'date', required: true },
        { name: 'rating_bucket', type: 'enum', required: false },
      ],
      fields: ['industry_sector', 'weighted_avg_yield', 'concentration_pct'],
      resultShape: 'Aggregate, 1 row per rating bucket',
      privacy: { aggregation: 5, differentialPrivacy: false },
      status: 'live',
      runs7d: 21,
    },
    {
      id: 'qt_non_accrual_rate',
      name: 'Non-accrual rate',
      description: 'Portfolio-level non-accrual rate as a percentage of outstanding balance.',
      inputs: [
        { name: 'as_of_date', type: 'date', required: true },
      ],
      fields: ['non_accrual_flag', 'concentration_pct'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: 10, differentialPrivacy: true },
      status: 'live',
      runs7d: 14,
    },
    {
      id: 'qt_weighted_avg_yield',
      name: 'Weighted-avg yield',
      description: 'Portfolio weighted-average yield, optionally filtered by sector.',
      inputs: [
        { name: 'as_of_date', type: 'date', required: true },
        { name: 'sector_filter', type: 'enum', required: false },
      ],
      fields: ['weighted_avg_yield', 'industry_sector'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 11,
    },
    {
      id: 'qt_single_name_exposure',
      name: 'Single-name exposure check',
      description: 'Returns whether any single obligor exceeds the concentration limit. Does not return names.',
      inputs: [
        { name: 'threshold_pct', type: 'number', required: true },
      ],
      fields: ['concentration_pct'],
      resultShape: 'Boolean flag + count of breaching buckets',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 0,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_concentration_by_sector', 'qt_advance_rate_by_rating', 'qt_non_accrual_rate', 'qt_weighted_avg_yield'],
      rateLimit: '1,000 / day',
      validFrom: daysAgo(120),
      validUntil: null,
      status: 'active',
      runs7d: 38,
      lastActivityAt: '12s ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_concentration_by_sector', 'qt_non_accrual_rate', 'qt_weighted_avg_yield'],
      rateLimit: '500 / day',
      validFrom: daysAgo(90),
      validUntil: null,
      status: 'active',
      runs7d: 24,
      lastActivityAt: '7 min ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_concentration_by_sector', 'qt_advance_rate_by_rating'],
      rateLimit: '200 / day',
      validFrom: daysAgo(60),
      validUntil: null,
      status: 'active',
      runs7d: 7,
      lastActivityAt: '2 h ago',
    },
  ],
}

const holdingsAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: 3,
  dpBudget: 2.0,
  dpBudgetUsedPct: 18,
  templates: [
    {
      id: 'qt_asset_class_breakdown',
      name: 'Asset class breakdown',
      description: 'Aggregate fair value by asset class.',
      inputs: [
        { name: 'as_of_date', type: 'date', required: true },
      ],
      fields: ['asset_class', 'fair_value_aggregate'],
      resultShape: 'Aggregate, 1 row per asset class',
      privacy: { aggregation: 3, differentialPrivacy: true },
      status: 'live',
      runs7d: 27,
    },
    {
      id: 'qt_custodian_concentration',
      name: 'Custodian concentration',
      description: 'Share of total positions held at each custodian.',
      inputs: [
        { name: 'as_of_date', type: 'date', required: true },
      ],
      fields: ['fair_value_aggregate', 'asset_class'],
      resultShape: 'Aggregate, 1 row per custodian (anonymized)',
      privacy: { aggregation: 3, differentialPrivacy: false },
      status: 'live',
      runs7d: 12,
    },
    {
      id: 'qt_segregation_rate',
      name: 'Segregation rate',
      description: 'Percentage of positions held in segregated accounts.',
      inputs: [],
      fields: ['asset_class', 'fair_value_aggregate'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 5,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_asset_class_breakdown', 'qt_custodian_concentration', 'qt_segregation_rate'],
      rateLimit: '500 / day',
      validFrom: daysAgo(100),
      validUntil: null,
      status: 'active',
      runs7d: 27,
      lastActivityAt: '3 min ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_asset_class_breakdown'],
      rateLimit: '200 / day',
      validFrom: daysAgo(75),
      validUntil: null,
      status: 'active',
      runs7d: 8,
      lastActivityAt: '1 h ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_asset_class_breakdown', 'qt_segregation_rate'],
      rateLimit: '100 / day',
      validFrom: daysAgo(45),
      validUntil: null,
      status: 'active',
      runs7d: 9,
      lastActivityAt: '4 h ago',
    },
  ],
}

const pricingAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: null,
  dpBudget: 0.5,
  dpBudgetUsedPct: 71,
  templates: [
    {
      id: 'qt_mid_price_by_venue',
      name: 'Mid-price by venue',
      description: 'Last mid-price per venue, per CUSIP.',
      inputs: [
        { name: 'cusip', type: 'string', required: true },
        { name: 'as_of', type: 'date', required: false },
      ],
      fields: ['security_cusip', 'mid_aggregate', 'venue'],
      resultShape: 'Aggregate, 1 row per venue',
      privacy: { aggregation: null, differentialPrivacy: true },
      status: 'live',
      runs7d: 62,
    },
    {
      id: 'qt_spread_distribution',
      name: 'Spread distribution',
      description: 'Bid-ask spread percentile distribution across the book.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
        { name: 'percentile_cuts', type: 'string', required: false },
      ],
      fields: ['venue', 'volume'],
      resultShape: 'Aggregate, P10/P25/P50/P75/P90 rows',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 19,
    },
    {
      id: 'qt_vwmid',
      name: 'Volume-weighted mid',
      description: 'Portfolio-level volume-weighted mid price.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['mid_aggregate', 'volume', 'venue'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: true },
      status: 'live',
      runs7d: 9,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_mid_price_by_venue', 'qt_spread_distribution', 'qt_vwmid'],
      rateLimit: '5,000 / day',
      validFrom: daysAgo(200),
      validUntil: null,
      status: 'active',
      runs7d: 62,
      lastActivityAt: '2 min ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_mid_price_by_venue', 'qt_vwmid'],
      rateLimit: '2,000 / day',
      validFrom: daysAgo(150),
      validUntil: null,
      status: 'active',
      runs7d: 28,
      lastActivityAt: '18 min ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_mid_price_by_venue'],
      rateLimit: '1,000 / day',
      validFrom: daysAgo(30),
      validUntil: null,
      status: 'active',
      runs7d: 0,
      lastActivityAt: '3 d ago',
    },
  ],
}

const navAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: null,
  dpBudget: null,
  dpBudgetUsedPct: null,
  templates: [
    {
      id: 'qt_nav_per_share',
      name: 'NAV per share',
      description: 'Current NAV per share and total shares outstanding.',
      inputs: [
        { name: 'reporting_date', type: 'date', required: false },
      ],
      fields: ['nav_per_share', 'shares_outstanding', 'reporting_date'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 41,
    },
    {
      id: 'qt_share_count_drift',
      name: 'Share count drift',
      description: 'Period-over-period change in shares outstanding.',
      inputs: [
        { name: 'periods', type: 'number', required: false },
      ],
      fields: ['shares_outstanding', 'reporting_date'],
      resultShape: 'Timeseries, 1 row per period',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 7,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_nav_per_share', 'qt_share_count_drift'],
      rateLimit: '100 / day',
      validFrom: daysAgo(180),
      validUntil: null,
      status: 'active',
      runs7d: 30,
      lastActivityAt: '6 h ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_nav_per_share'],
      rateLimit: '100 / day',
      validFrom: daysAgo(90),
      validUntil: null,
      status: 'active',
      runs7d: 11,
      lastActivityAt: '1 d ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_nav_per_share'],
      rateLimit: '50 / day',
      validFrom: daysAgo(45),
      validUntil: null,
      status: 'active',
      runs7d: 7,
      lastActivityAt: '2 d ago',
    },
  ],
}

const borrowerAccess: DatasetAccess = {
  privacyUnit: 'borrower_did',
  aggregationThreshold: 5,
  dpBudget: 1.5,
  dpBudgetUsedPct: 29,
  templates: [
    {
      id: 'qt_covenant_headroom',
      name: 'Covenant headroom distribution',
      description: 'Percentile distribution of covenant headroom across borrowers.',
      inputs: [
        { name: 'reporting_period', type: 'date', required: true },
        { name: 'percentile_cuts', type: 'string', required: false },
      ],
      fields: ['covenant_headroom_pct', 'covenant_status'],
      resultShape: 'Aggregate, P25/P50/P75 rows',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 16,
    },
    {
      id: 'qt_risk_grade_migration',
      name: 'Risk grade migration',
      description: 'Quarter-over-quarter risk grade upgrade/downgrade counts.',
      inputs: [
        { name: 'from_period', type: 'date', required: true },
        { name: 'to_period', type: 'date', required: true },
      ],
      fields: ['risk_grade', 'reporting_period'],
      resultShape: 'Migration matrix, N×N rows',
      privacy: { aggregation: 5, differentialPrivacy: false },
      status: 'live',
      runs7d: 4,
    },
    {
      id: 'qt_leverage_cohorts',
      name: 'Leverage cohorts',
      description: 'Borrower count bucketed by leverage ratio range.',
      inputs: [
        { name: 'reporting_period', type: 'date', required: true },
        { name: 'bucket_width', type: 'number', required: false },
      ],
      fields: ['risk_grade', 'covenant_headroom_pct'],
      resultShape: 'Aggregate, 1 row per leverage bucket',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'draft',
      runs7d: 0,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_covenant_headroom', 'qt_risk_grade_migration'],
      rateLimit: '200 / day',
      validFrom: daysAgo(90),
      validUntil: null,
      status: 'active',
      runs7d: 16,
      lastActivityAt: '8 h ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_covenant_headroom'],
      rateLimit: '100 / day',
      validFrom: daysAgo(60),
      validUntil: null,
      status: 'paused',
      runs7d: 0,
      lastActivityAt: '5 d ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_risk_grade_migration'],
      rateLimit: '50 / day',
      validFrom: daysAgo(30),
      validUntil: daysFromNow(60),
      status: 'active',
      runs7d: 4,
      lastActivityAt: '1 d ago',
    },
  ],
}

export const datasetAccess: Record<string, DatasetAccess> = {
  loanbook: loanbookAccess,
  holdings: holdingsAccess,
  pricing: pricingAccess,
  'nav-report': navAccess,
  'borrower-performance': borrowerAccess,
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
