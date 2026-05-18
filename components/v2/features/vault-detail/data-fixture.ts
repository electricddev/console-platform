/**
 * Data page fixture — synced datasets inside ACRED-style vaults.
 * Each dataset combines: source connection + schema with field-level privacy
 * + ASC 820 fair-value classification + sync history.
 */

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()
const daysFromNow = (d: number) => new Date(NOW + d * 86_400_000).toISOString()

/**
 * Privacy tier — the heart of the vault clean room. Determines how a field
 * participates in counterparty queries.
 *
 *   private   → Never accessible. Blocked at ingest, no path out.
 *   join      → Usable as a match key only. Raw value never returned.
 *   aggregate → Only usable inside aggregate functions. Raw rows never returned.
 *   dimension → Usable in GROUP BY; returned as a label (categorical only).
 *   select    → Raw value returnable. Only for non-sensitive fields.
 *
 * The gradient runs from most-protected (private) to most-open (select).
 */
export type PrivacyLevel = 'private' | 'join' | 'aggregate' | 'dimension' | 'select'

/**
 * Dataset-level analysis rule — constrains what kinds of queries are
 * permitted against this dataset regardless of field-level classifications.
 *
 *   aggregation → only aggregate queries; no row-level output ever returned
 *   list        → only intersection/overlap queries returning entity match lists
 *   custom      → only pre-approved query templates may run
 */
export type AnalysisRule = 'aggregation' | 'list' | 'custom'

export type FieldType = 'string' | 'number' | 'currency' | 'percent' | 'date' | 'enum' | 'address' | 'bool' | 'hash'

export interface DatasetField {
  name: string
  type: FieldType
  privacy: PrivacyLevel
  /** Plain-language hint, e.g. "Borrower legal name" */
  description?: string
}

export type DatasetStatus = 'live' | 'syncing' | 'failed'

/** ASC 820 fair value hierarchy. */
export type AscClass = 'L1' | 'L2' | 'L3'

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
  /** ISO timestamp of the most recent completed sync. */
  lastSyncedAt: string
  /** Dataset-level query constraint — see AnalysisRule. */
  analysisRule: AnalysisRule
}

// ── Loan tape (Family 3: positions) ─────────────────────────────────────────
//
// Full private-credit loan tape. Combines AICPA Schedule of Investments columns
// (ASC 946), ILPA Reporting Template v2.0 metadata, and the standard 80–200-field
// loan tape format used by Houlihan Lokey / Bloomberg / Pitchbook private credit
// datasets. Position-level grain — one row per outstanding loan position.
const loanTapeFields: DatasetField[] = [
  // Identifiers ----------------------------------------------------------
  { name: 'loan_id', type: 'string', privacy: 'join', description: 'Internal loan reference — used as a match key, never returned.' },
  { name: 'position_id', type: 'string', privacy: 'join', description: 'Position identifier — match key only; one loan may carry several positions across tranches.' },
  { name: 'borrower_did', type: 'string', privacy: 'join', description: 'Borrower decentralized identifier — the privacy unit for this dataset.' },
  { name: 'borrower_legal_name', type: 'string', privacy: 'private', description: 'Legal name of the borrowing entity.' },
  { name: 'as_of_date', type: 'date', privacy: 'select', description: 'Valuation date for this row.' },

  // Instrument classification --------------------------------------------
  { name: 'instrument_type', type: 'enum', privacy: 'dimension', description: 'Detailed tape type — sr_secured_term_loan | unitranche | 2nd_lien | mezz | sub | pref_eq | abl | bond.' },
  { name: 'asset_class', type: 'enum', privacy: 'dimension', description: 'Asset class bucket — senior_secured_loan | first_lien | second_lien | unitranche | subordinated | other.' },
  { name: 'lien_position', type: 'enum', privacy: 'dimension', description: 'First-lien / second-lien / unsecured.' },
  { name: 'seniority', type: 'enum', privacy: 'dimension', description: 'senior | mezz | sub | equity.' },
  { name: 'secured', type: 'bool', privacy: 'select', description: 'True if secured by collateral.' },
  { name: 'collateral_type', type: 'enum', privacy: 'dimension', description: 'RE | current_assets | IP | equipment | none.' },
  { name: 'asc_class', type: 'enum', privacy: 'dimension', description: 'ASC 820 fair-value tier (L1 / L2 / L3).' },
  { name: 'pricing_source', type: 'enum', privacy: 'dimension', description: 'model | houlihan | dlx | lincoln | dealer.' },

  // Borrower classification ----------------------------------------------
  { name: 'industry_sector', type: 'enum', privacy: 'dimension', description: 'GICS sector — usable in GROUP BY.' },
  { name: 'industry_code', type: 'enum', privacy: 'dimension', description: 'NAICS 2-digit industry classification code.' },
  { name: 'borrower_country', type: 'enum', privacy: 'dimension', description: 'ISO-3166 alpha-2 country code of the obligor.' },
  { name: 'borrower_msa', type: 'string', privacy: 'private', description: 'US Metropolitan Statistical Area — too granular to expose.' },
  { name: 'originator_lender', type: 'enum', privacy: 'dimension', description: 'Originator — Apollo | club | syndicate name.' },
  { name: 'is_affiliated', type: 'bool', privacy: 'select', description: 'Related-party flag — required SOI footnote disclosure.' },

  // Sizing ---------------------------------------------------------------
  { name: 'facility_amount', type: 'currency', privacy: 'aggregate', description: 'Total committed facility size.' },
  { name: 'commitment_par', type: 'currency', privacy: 'aggregate', description: 'Committed par — SUM only.' },
  { name: 'funded_par', type: 'currency', privacy: 'aggregate', description: 'Drawn balance — SUM only.' },
  { name: 'unfunded_par', type: 'currency', privacy: 'aggregate', description: 'Unfunded commitment — SUM only.' },
  { name: 'par_value', type: 'currency', privacy: 'aggregate', description: 'Face / par value at the position level.' },
  { name: 'current_balance', type: 'currency', privacy: 'aggregate', description: 'Outstanding drawn balance.' },
  { name: 'fair_value', type: 'currency', privacy: 'aggregate', description: 'ASC 820 fair value mark — SUM only.' },
  { name: 'cost_basis', type: 'currency', privacy: 'private', description: 'Original cost basis — blocked (tax / IRR analysis only).' },
  { name: 'pct_net_assets', type: 'percent', privacy: 'aggregate', description: 'Position as % of NAV — required 10-Q SOI field.' },
  { name: 'concentration_pct', type: 'percent', privacy: 'aggregate', description: 'Obligor share of total portfolio.' },

  // Rate structure -------------------------------------------------------
  { name: 'reference_rate', type: 'enum', privacy: 'dimension', description: 'Floating index — SOFR | SONIA | EURIBOR | FIXED.' },
  { name: 'spread_bps', type: 'number', privacy: 'aggregate', description: 'Margin over reference rate in basis points.' },
  { name: 'all_in_rate_bps', type: 'number', privacy: 'aggregate', description: 'All-in coupon yield in basis points.' },
  { name: 'floor_bps', type: 'number', privacy: 'select', description: 'SOFR / index floor in basis points.' },
  { name: 'coupon_rate', type: 'percent', privacy: 'aggregate', description: 'Applicable interest rate.' },
  { name: 'pik_pct', type: 'percent', privacy: 'aggregate', description: 'Payment-in-kind portion of coupon.' },
  { name: 'weighted_avg_yield', type: 'percent', privacy: 'aggregate', description: 'Computable across the portfolio.' },

  // Dates ----------------------------------------------------------------
  { name: 'origination_date', type: 'date', privacy: 'aggregate', description: 'Loan origination date — aggregate only.' },
  { name: 'maturity_date', type: 'date', privacy: 'private', description: 'Loan maturity date — row-level blocked.' },
  { name: 'wam_months', type: 'number', privacy: 'select', description: 'Computed weighted-average maturity for this position in months.' },
  { name: 'vintage_year', type: 'number', privacy: 'dimension', description: 'Origination year — usable in GROUP BY.' },
  { name: 'last_payment_date', type: 'date', privacy: 'private', description: 'Most recent payment date.' },

  // Credit / leverage ----------------------------------------------------
  { name: 'ltv_band', type: 'enum', privacy: 'dimension', description: 'LTV bucket — <50% | 50-65% | 65-75% | 75-85% | >85%.' },
  { name: 'ltv_ratio', type: 'percent', privacy: 'aggregate', description: 'Precise LTV — aggregate only; row-level use ltv_band.' },
  { name: 'loan_to_ebitda_x', type: 'number', privacy: 'aggregate', description: 'Leverage multiple.' },
  { name: 'interest_coverage_x', type: 'number', privacy: 'aggregate', description: 'EBITDA / interest expense.' },
  { name: 'internal_rating', type: 'enum', privacy: 'dimension', description: 'Apollo internal rating 1–5.' },
  { name: 'external_rating', type: 'enum', privacy: 'dimension', description: 'S&P-equivalent rating where assigned.' },
  { name: 'risk_grade', type: 'enum', privacy: 'dimension', description: 'Internal risk band for grouping.' },
  { name: 'recovery_estimate', type: 'percent', privacy: 'aggregate', description: 'Estimated recovery in default.' },

  // Status & covenants ---------------------------------------------------
  { name: 'status', type: 'enum', privacy: 'dimension', description: 'performing | watch | non_performing.' },
  { name: 'default_status', type: 'enum', privacy: 'dimension', description: 'performing | watchlist | default | restructure.' },
  { name: 'non_accrual_flag', type: 'bool', privacy: 'select', description: 'Binary non-accrual status — non-identifying when aggregated; SOI footnote requirement.' },
  { name: 'restructured', type: 'bool', privacy: 'aggregate', description: 'Restructured flag — required SOI footnote; aggregate share only.' },
  { name: 'covenants_loose', type: 'bool', privacy: 'aggregate', description: 'Cov-lite flag — aggregate share only.' },
]

// ── NAV history (Family 1: daily NAV strikes) ───────────────────────────────

const navHistoryFields: DatasetField[] = [
  { name: 'fund_id', type: 'string', privacy: 'select', description: 'Fund identifier.' },
  { name: 'class_id', type: 'enum', privacy: 'dimension', description: 'Share class identifier.' },
  { name: 'as_of', type: 'date', privacy: 'select', description: 'NAV strike timestamp.' },
  { name: 'nav_per_share', type: 'currency', privacy: 'select', description: 'NAV per share at strike.' },
  { name: 'aum_usd', type: 'currency', privacy: 'select', description: 'AUM at strike — the "current NAV" total.' },
  { name: 'shares_outstanding', type: 'number', privacy: 'select', description: 'Shares outstanding at strike.' },
  { name: 'gross_assets', type: 'currency', privacy: 'aggregate', description: 'Gross asset value at strike.' },
  { name: 'total_liabilities', type: 'currency', privacy: 'aggregate', description: 'Total liabilities at strike.' },
  { name: 'accrued_income', type: 'currency', privacy: 'aggregate', description: 'Accrued income since last strike.' },
  { name: 'return_daily', type: 'percent', privacy: 'select', description: 'Daily return as a fraction.' },
  { name: 'return_mtd', type: 'percent', privacy: 'select', description: 'Month-to-date return as a fraction.' },
  { name: 'return_qtd', type: 'percent', privacy: 'select', description: 'Quarter-to-date return as a fraction.' },
  { name: 'return_ytd', type: 'percent', privacy: 'select', description: 'Year-to-date return as a fraction.' },
  { name: 'nav_source', type: 'enum', privacy: 'dimension', description: 'Administrator system that produced this NAV — bloomberg | custodian | manual.' },
  { name: 'next_nav_at', type: 'date', privacy: 'select', description: 'Scheduled timestamp for the next NAV publication.' },
  { name: 'nav_delta_pct', type: 'percent', privacy: 'aggregate', description: 'NAV change since previous strike — aggregable across time periods.' },
  { name: 'attestation_id', type: 'hash', privacy: 'join', description: 'TSSO attestation hash for this strike — match key into audit chain.' },
]

// ── Position pricing (Family 3: ASC 820 Level 3 daily marks) ────────────────

const positionPricingFields: DatasetField[] = [
  { name: 'position_id', type: 'string', privacy: 'join', description: 'Position identifier — match key only.' },
  { name: 'mark_date', type: 'date', privacy: 'select', description: 'Pricing mark date.' },
  { name: 'bid', type: 'currency', privacy: 'aggregate', description: 'Bid mark — aggregate only.' },
  { name: 'mid', type: 'currency', privacy: 'aggregate', description: 'Mid mark — aggregate only.' },
  { name: 'offer', type: 'currency', privacy: 'aggregate', description: 'Offer mark — aggregate only.' },
  { name: 'price_change_bps', type: 'number', privacy: 'aggregate', description: 'Period-over-period price change in basis points.' },
  { name: 'valuation_committee_approved', type: 'bool', privacy: 'select', description: 'Apollo valuation committee approval flag.' },
  { name: 'third_party_provider', type: 'enum', privacy: 'dimension', description: 'Houlihan Lokey | Lincoln Intl. | DLx | other.' },
  { name: 'pricing_level', type: 'enum', privacy: 'dimension', description: 'ASC 820 Level — L1 | L2 | L3.' },
]


// ── Fund master (Family 1: fund identity + share class) ─────────────────────

const fundMasterFields: DatasetField[] = [
  // Fund identity
  { name: 'fund_id', type: 'string', privacy: 'select', description: 'Fund identifier — "acred".' },
  { name: 'legal_name', type: 'string', privacy: 'select', description: 'Legal fund name — "Apollo Diversified Credit Securitize Fund".' },
  { name: 'manager', type: 'string', privacy: 'select', description: 'Investment manager — "Apollo Global Management".' },
  { name: 'administrator', type: 'string', privacy: 'select', description: 'Fund administrator — "SS&C Technologies".' },
  { name: 'auditor', type: 'string', privacy: 'select', description: 'External auditor — "PwC".' },
  { name: 'custodian', type: 'string', privacy: 'select', description: 'Primary custodian — "BNY Mellon".' },
  { name: 'domicile', type: 'string', privacy: 'select', description: 'Legal domicile — "Delaware, USA".' },
  { name: 'strategy', type: 'enum', privacy: 'dimension', description: 'Strategy classification — diversified_credit | direct_lending | abs | treasury | mixed.' },
  { name: 'inception_date', type: 'date', privacy: 'select', description: 'Fund inception (2025-01-30 for ACRED).' },
  { name: 'base_currency', type: 'enum', privacy: 'select', description: 'Base reporting currency — ISO 4217.' },
  { name: 'nav_frequency', type: 'enum', privacy: 'select', description: 'NAV strike cadence — daily | weekly | monthly | quarterly.' },
  { name: 'is_feeder', type: 'bool', privacy: 'select', description: 'True if this is a feeder into a master fund.' },
  { name: 'master_fund_lei', type: 'string', privacy: 'select', description: 'Legal Entity Identifier of the master fund (G20 standard).' },
  { name: 'issuer_did', type: 'string', privacy: 'select', description: 'Securitize DID for the tokenized share class.' },
  // Share class (one row per chain deployment)
  { name: 'class_id', type: 'string', privacy: 'select', description: 'Share class identifier — "acred", "sacred".' },
  { name: 'chain', type: 'enum', privacy: 'dimension', description: 'Deployed chain — ethereum | aptos | avalanche | polygon | solana | ink | sei.' },
  { name: 'contract_address', type: 'address', privacy: 'select', description: 'ERC-20 token contract address on the deployed chain.' },
  { name: 'cusip', type: 'string', privacy: 'select', description: 'CUSIP for the share class where assigned.' },
  { name: 'isin', type: 'string', privacy: 'select', description: 'ISIN for the share class where assigned.' },
  { name: 'min_investment_usd', type: 'currency', privacy: 'select', description: 'Subscription minimum in USD.' },
  { name: 'mgmt_fee_bps', type: 'number', privacy: 'select', description: 'Annual management fee in basis points.' },
  { name: 'perf_fee_bps', type: 'number', privacy: 'select', description: 'Performance / carried interest in basis points.' },
  { name: 'hurdle_bps', type: 'number', privacy: 'select', description: 'Preferred return hurdle in basis points.' },
  { name: 'eligibility', type: 'enum', privacy: 'dimension', description: 'Investor eligibility — "Reg D 506(c) accredited" | "QIB".' },
]

// ── Cash & flows (Family 2: cash balances + daily flow events) ──────────────

const cashPositionsFields: DatasetField[] = [
  { name: 'record_type', type: 'enum', privacy: 'dimension', description: 'Row grain — cash_balance | flow | redemption.' },
  // Cash balances grain
  { name: 'as_of', type: 'date', privacy: 'select', description: 'Balance / event as-of timestamp.' },
  { name: 'currency', type: 'enum', privacy: 'dimension', description: 'ISO 4217 currency code or stablecoin symbol.' },
  { name: 'custodian', type: 'enum', privacy: 'dimension', description: 'Custodian — BNY Mellon | Anchorage Digital | State Street.' },
  { name: 'account_type', type: 'enum', privacy: 'dimension', description: 'Account purpose — operating | subscription | redemption | escrow.' },
  { name: 'balance', type: 'currency', privacy: 'aggregate', description: 'Cash balance in stated currency — aggregate only.' },
  { name: 'balance_usd_equiv', type: 'currency', privacy: 'aggregate', description: 'USD-equivalent balance at as_of FX rate.' },
  // Daily flow grain
  { name: 'flow_date', type: 'date', privacy: 'select', description: 'Flow effective date.' },
  { name: 'flow_type', type: 'enum', privacy: 'dimension', description: 'subscription | redemption | distribution_income | distribution_return_of_capital | pik_accrual.' },
  { name: 'class_id', type: 'enum', privacy: 'dimension', description: 'Share class identifier.' },
  { name: 'investor_tier', type: 'enum', privacy: 'dimension', description: 'institutional | accredited | defi_wrapper.' },
  { name: 'gross_amount_usd', type: 'currency', privacy: 'aggregate', description: 'Gross flow amount — aggregate across investors.' },
  { name: 'share_count', type: 'number', privacy: 'aggregate', description: 'Number of shares created or redeemed.' },
  // Redemption queue grain
  { name: 'redemption_id', type: 'string', privacy: 'join', description: 'Redemption request identifier — match key only.' },
  { name: 'investor_id', type: 'string', privacy: 'private', description: 'Investor identifier — PII, blocked at ingest.' },
  { name: 'requested_at', type: 'date', privacy: 'aggregate', description: 'Request submission timestamp.' },
  { name: 'amount_usd', type: 'currency', privacy: 'aggregate', description: 'Per-row redemption amount.' },
  { name: 'status', type: 'enum', privacy: 'dimension', description: 'pending | processing | settled | cancelled.' },
  { name: 'estimated_settlement_date', type: 'date', privacy: 'select', description: 'Projected settlement date for the request.' },
  { name: 'next_cycle_at', type: 'date', privacy: 'select', description: 'Timestamp of the next redemption settlement cycle.' },
  { name: 'oldest_at', type: 'date', privacy: 'select', description: 'Timestamp of the oldest pending redemption request.' },
  { name: 'pending_usd', type: 'currency', privacy: 'select', description: 'Total USD value of pending redemption requests at as_of.' },
  { name: 'holder_count', type: 'number', privacy: 'aggregate', description: 'Number of distinct holders with pending requests.' },
]

// ── Capital accounts (Family 2: ILPA v2.0 quarterly) ────────────────────────

const capitalAccountFields: DatasetField[] = [
  { name: 'as_of', type: 'date', privacy: 'select', description: 'Period-end date.' },
  { name: 'investor_tier', type: 'enum', privacy: 'dimension', description: 'Investor classification tier — institutional | accredited | defi_wrapper.' },
  { name: 'beginning_balance', type: 'currency', privacy: 'aggregate', description: 'Tier beginning balance.' },
  { name: 'contributions', type: 'currency', privacy: 'aggregate', description: 'Capital contributions during period.' },
  { name: 'distributions_recallable', type: 'currency', privacy: 'aggregate', description: 'Recallable distributions during period.' },
  { name: 'distributions_non_recallable', type: 'currency', privacy: 'aggregate', description: 'Non-recallable distributions during period.' },
  { name: 'mgmt_fee_charged', type: 'currency', privacy: 'aggregate', description: 'Management fee charged to tier.' },
  { name: 'realized_gain_loss', type: 'currency', privacy: 'aggregate', description: 'Realized P&L allocated to tier.' },
  { name: 'unrealized_gain_loss', type: 'currency', privacy: 'aggregate', description: 'Unrealized P&L allocated to tier.' },
  { name: 'ending_balance', type: 'currency', privacy: 'aggregate', description: 'Tier ending balance.' },
  { name: 'investor_id', type: 'string', privacy: 'private', description: 'Investor identifier — never exposed; rollup only.' },
]

// ── Risk pack (Family 4: concentration + risk + rating distribution) ────────

const riskPackFields: DatasetField[] = [
  { name: 'record_type', type: 'enum', privacy: 'dimension', description: 'Row grain — portfolio | rating_bucket | vintage_cohort.' },
  // Concentration metrics (portfolio grain)
  { name: 'as_of', type: 'date', privacy: 'select', description: 'As-of date.' },
  { name: 'top_1_borrower_pct', type: 'percent', privacy: 'select', description: 'Top single-borrower exposure as % of NAV (anonymized).' },
  { name: 'top_5_borrower_pct', type: 'percent', privacy: 'select', description: 'Top-5 borrower exposure as % of NAV.' },
  { name: 'top_10_borrower_pct', type: 'percent', privacy: 'select', description: 'Top-10 borrower exposure as % of NAV.' },
  { name: 'largest_industry_pct', type: 'percent', privacy: 'select', description: 'Largest industry exposure as % of NAV.' },
  { name: 'industry_hhi', type: 'number', privacy: 'select', description: 'Herfindahl-Hirschman index by industry (0–10,000).' },
  { name: 'geographic_hhi', type: 'number', privacy: 'select', description: 'HHI by borrower country.' },
  { name: 'non_accrual_pct', type: 'percent', privacy: 'select', description: 'Non-accrual exposure as % of fair value.' },
  { name: 'pik_pct', type: 'percent', privacy: 'select', description: 'PIK exposure as % of par.' },
  { name: 'cov_lite_pct', type: 'percent', privacy: 'select', description: 'Covenant-lite share as % of par.' },
  { name: 'floating_rate_pct', type: 'percent', privacy: 'select', description: 'Floating-rate share as % of par.' },
  // Risk metrics (weighted statistics)
  { name: 'wal_years', type: 'number', privacy: 'select', description: 'Weighted average life in years.' },
  { name: 'was_bps', type: 'number', privacy: 'select', description: 'Weighted average spread in basis points.' },
  { name: 'war_bps', type: 'number', privacy: 'select', description: 'Weighted average rate in basis points.' },
  { name: 'wac_bps', type: 'number', privacy: 'select', description: 'Weighted average coupon in basis points.' },
  { name: 'modified_duration', type: 'number', privacy: 'select', description: 'Modified duration in years.' },
  { name: 'spread_duration', type: 'number', privacy: 'select', description: 'Spread duration in years.' },
  { name: 'weighted_internal_rating', type: 'number', privacy: 'select', description: 'Par-weighted internal rating (1–5).' },
  { name: 'pct_default_or_watchlist', type: 'percent', privacy: 'select', description: 'Share of par in default or watchlist status.' },
  // Rating distribution (rating_bucket grain)
  { name: 'rating_bucket', type: 'enum', privacy: 'dimension', description: 'Rating bucket — AAA..D | NR | internal_1..5.' },
  { name: 'position_count', type: 'number', privacy: 'aggregate', description: 'Number of positions in this bucket.' },
  { name: 'pct_fair_value', type: 'percent', privacy: 'select', description: 'Bucket share of fair value.' },
  { name: 'pct_par', type: 'percent', privacy: 'select', description: 'Bucket share of par.' },
  // Vintage cohort grain
  { name: 'vintage_year', type: 'number', privacy: 'select', description: 'Origination year of the cohort.' },
  { name: 'total_par', type: 'currency', privacy: 'select', description: 'Total par of performing positions in the vintage.' },
  { name: 'wac', type: 'percent', privacy: 'select', description: 'Weighted average coupon across the vintage.' },
  { name: 'default_rate_ytd', type: 'percent', privacy: 'select', description: 'Year-to-date default rate for this vintage.' },
  { name: 'recovery_rate_avg', type: 'percent', privacy: 'select', description: 'Average recovery rate on defaulted positions in this vintage.' },
]

// ── Accounting ledger (Family 5: typed accounts + ILPA fees) ────────────────

const accountingLedgerFields: DatasetField[] = [
  { name: 'record_type', type: 'enum', privacy: 'dimension', description: 'Row grain — ledger | fee | cash_flow_summary.' },
  // Trial balance (ledger grain)
  { name: 'as_of', type: 'date', privacy: 'select', description: 'Posting date.' },
  { name: 'account_type', type: 'enum', privacy: 'dimension', description: 'asset | liability | equity | gain | loss | expense | income.' },
  { name: 'account_subtype', type: 'enum', privacy: 'dimension', description: 'loans_at_fv | cash | accrued_interest | mgmt_fee_payable | subscription_payable | nav | …' },
  { name: 'balance', type: 'currency', privacy: 'aggregate', description: 'Account balance — aggregate only.' },
  { name: 'currency', type: 'enum', privacy: 'dimension', description: 'ISO 4217 currency code.' },
  // ILPA Reporting Template v2.0 fees & expenses (fee grain)
  { name: 'period', type: 'enum', privacy: 'dimension', description: 'Reporting period — 2026Q1 | 2026Q2 | …' },
  { name: 'category', type: 'enum', privacy: 'dimension', description: 'mgmt_fee | carried_interest_accrued | carried_interest_realized | placement_fee | offering_syndication_costs | third_party_valuations | external_partnership_expenses | subscription_line_interest | investigation_examination_fees | partner_transfers | fund_admin | audit_tax | legal.' },
  { name: 'amount_usd', type: 'currency', privacy: 'aggregate', description: 'Period amount in USD.' },
  { name: 'paid_to_affiliate', type: 'bool', privacy: 'select', description: 'Whether the recipient is an affiliate of the manager (ILPA disclosure).' },
  // Cash-flow summary grain (DSCR support)
  { name: 'net_interest_income', type: 'currency', privacy: 'aggregate', description: 'Period net interest income (revenue minus interest expense).' },
  { name: 'total_obligations', type: 'currency', privacy: 'aggregate', description: 'Period total obligations (interest + principal due).' },
]

// ── Reference data (Family 6: borrowers + industries + instruments) ─────────

const referenceDataFields: DatasetField[] = [
  { name: 'record_type', type: 'enum', privacy: 'dimension', description: 'Row grain — borrower | industry | instrument.' },
  // Borrower grain
  { name: 'borrower_id', type: 'string', privacy: 'join', description: 'Synthetic borrower identifier — match key only, never returned.' },
  { name: 'legal_name', type: 'string', privacy: 'private', description: 'Borrower legal name — blocked at ingest.' },
  { name: 'lei', type: 'string', privacy: 'private', description: 'Legal Entity Identifier — blocked at ingest.' },
  { name: 'industry_gics', type: 'enum', privacy: 'dimension', description: 'GICS industry — usable in GROUP BY.' },
  { name: 'country', type: 'enum', privacy: 'dimension', description: 'ISO-3166 alpha-2 country code.' },
  { name: 'is_sponsored', type: 'bool', privacy: 'select', description: 'PE-sponsored vs founder / family-owned.' },
  { name: 'sponsor_tier', type: 'enum', privacy: 'dimension', description: 'tier_1_megafund | mid_market | lower_mm | non_sponsored.' },
  // Industries (GICS taxonomy)
  { name: 'gics_code', type: 'string', privacy: 'select', description: 'GICS 8-digit code.' },
  { name: 'sector', type: 'string', privacy: 'select', description: 'GICS Level 1 sector.' },
  { name: 'industry_group', type: 'string', privacy: 'select', description: 'GICS Level 2 industry group.' },
  { name: 'industry', type: 'string', privacy: 'select', description: 'GICS Level 3 industry.' },
  { name: 'sub_industry', type: 'string', privacy: 'select', description: 'GICS Level 4 sub-industry.' },
  // Instruments
  { name: 'cusip', type: 'string', privacy: 'select', description: 'CUSIP identifier.' },
  { name: 'isin', type: 'string', privacy: 'select', description: 'ISIN identifier.' },
  { name: 'instrument_name', type: 'string', privacy: 'select', description: 'Tranche / instrument name.' },
  { name: 'instrument_type', type: 'enum', privacy: 'dimension', description: 'Tranche classification.' },
]

export const datasets: Dataset[] = [
  {
    id: 'fund-master',
    name: 'Fund master',
    source: 'Securitize · platform',
    sourceId: 'securitize-platform',
    description:
      'Fund identity + tokenized share class registry. Manager, administrator, custodian, fee terms, on-chain contract addresses. Updated only on legal-document change.',
    status: 'live',
    ascClass: 'L1',
    recordCount: 7,
    fieldCount: 25,
    fields: fundMasterFields,
    lastSyncedAt: daysAgo(2),
    analysisRule: 'aggregation',
  },
  {
    id: 'nav-history',
    name: 'NAV history',
    source: 'SS&C · fund admin',
    sourceId: 'ssc-fund-admin',
    description:
      'Daily NAV strikes — append-only timeseries with per-share price, AUM, gross assets, liabilities, and period returns. Cryptographically chained via TSSO attestation hashes.',
    status: 'live',
    ascClass: 'L1',
    recordCount: 478,
    fieldCount: 14,
    fields: navHistoryFields,
    lastSyncedAt: hoursAgo(2),
    analysisRule: 'aggregation',
  },
  {
    id: 'loan-tape',
    name: 'Loan tape',
    source: 'Apollo PMS',
    sourceId: 'apollo-pms',
    description:
      'Loan-level portfolio at position grain. AICPA Schedule of Investments (ASC 946) columns plus the standard private-credit loan-tape fields used by Houlihan Lokey / Bloomberg / Pitchbook private credit datasets.',
    status: 'live',
    ascClass: 'L3',
    recordCount: 14_209,
    fieldCount: 847,
    fields: loanTapeFields,
    lastSyncedAt: minsAgo(11),
    analysisRule: 'aggregation',
  },
  {
    id: 'position-pricing',
    name: 'Position pricing',
    source: 'Houlihan Lokey · Lincoln · DLx',
    sourceId: 'third-party-valuations',
    description:
      'Per-position ASC 820 Level 3 pricing marks from third-party private-credit valuation providers. One row per (position, mark_date) — daily cadence with valuation-committee approval flag.',
    status: 'live',
    ascClass: 'L3',
    recordCount: 12_840,
    fieldCount: 9,
    fields: positionPricingFields,
    lastSyncedAt: hoursAgo(4),
    analysisRule: 'aggregation',
  },
  {
    id: 'cash-positions',
    name: 'Cash positions',
    source: 'BNY Mellon · custody',
    sourceId: 'bny-custodian',
    description:
      'Cash on hand by currency, custodian, and account purpose, plus daily flow events — subscriptions, redemptions, distributions, PIK accruals. Hourly custody sweep merged with portal-event flows.',
    status: 'live',
    ascClass: 'L1',
    recordCount: 3_842,
    fieldCount: 38,
    fields: cashPositionsFields,
    lastSyncedAt: minsAgo(14),
    analysisRule: 'aggregation',
  },
  {
    id: 'capital-accounts',
    name: 'Capital accounts',
    source: 'SS&C · ILPA template v2.0',
    sourceId: 'ssc-ilpa',
    description:
      'ILPA Reporting Template v2.0 quarterly capital account rollup — beginning / contributions / distributions / fees / P&L / ending balance per investor tier. Investor-tier aggregates only.',
    status: 'live',
    ascClass: 'L3',
    recordCount: 12,
    fieldCount: 14,
    fields: capitalAccountFields,
    lastSyncedAt: daysAgo(38),
    analysisRule: 'aggregation',
  },
  {
    id: 'risk-pack',
    name: 'Risk pack',
    source: 'Apollo risk · derived',
    sourceId: 'apollo-risk-derived',
    description:
      'Pre-aggregated risk view built explicitly for counterparty consumption — top-N concentration, HHI, weighted statistics (WAL / WAS / duration), rating-bucket distribution. Derived nightly from the loanbook.',
    status: 'live',
    ascClass: 'L3',
    recordCount: 1_840,
    fieldCount: 28,
    fields: riskPackFields,
    lastSyncedAt: hoursAgo(5),
    analysisRule: 'aggregation',
  },
  {
    id: 'accounting-ledger',
    name: 'Accounting ledger',
    source: 'SS&C · fund accounting',
    sourceId: 'ssc-fund-accounting',
    description:
      'Typed-account general ledger (assets, liabilities, equity, gains, losses, expenses, income) at daily trial-balance grain, plus the ILPA v2.0 quarterly fee and expense categories.',
    status: 'live',
    ascClass: 'L2',
    recordCount: 28_419,
    fieldCount: 64,
    fields: accountingLedgerFields,
    lastSyncedAt: hoursAgo(9),
    analysisRule: 'aggregation',
  },
  {
    id: 'reference-data',
    name: 'Reference data',
    source: 'Bloomberg · GICS · Apollo origination',
    sourceId: 'reference-bbg-gics',
    description:
      'Static reference data — borrower master, GICS 4-level industry taxonomy, CUSIP / ISIN instrument identifiers. Borrower identity fields are private; classification and lookup fields are open.',
    status: 'live',
    ascClass: 'L1',
    recordCount: 487,
    fieldCount: 32,
    fields: referenceDataFields,
    lastSyncedAt: daysAgo(7),
    analysisRule: 'list',
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
  'loan-tape': {
    syncMethod: 'scheduled',
    schedule: 'Daily 06:00 ET',
    lastSyncAt: minsAgo(11),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(new Date().getHours() + 3, 14, 0, 0)).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Schema match', description: 'Inbound schema must match loan-tape schema v3', status: 'pass' },
      { name: 'Row count drift', description: '≤5% week-over-week', status: 'pass' },
      { name: 'Value range — par_value', description: '$0–$50M per position', status: 'pass' },
      { name: 'PII column required-private', description: 'borrower_legal_name, borrower_msa, cost_basis, last_payment_date, maturity_date must be private', status: 'pass' },
      { name: 'Position ↔ borrower integrity', description: 'Every position_id resolves to a borrower_id in reference-data', status: 'pass' },
      { name: 'Freshness window', description: 'Last sync ≤ 24 h', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['risk@apollo.com', 'mark.t@securitize.io'],
      webhook: 'https://hooks.securitize.io/hyve/loan-tape',
    },
  },
  'nav-history': {
    syncMethod: 'scheduled',
    schedule: 'Daily 17:00 ET · NAV strike',
    lastSyncAt: hoursAgo(2),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(17, 0, 0, 0) + 86_400_000).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'NAV reconciliation', description: 'aum_usd reconciles to ledger.nav balance ± 1 USD', status: 'pass' },
      { name: 'Strike monotonic', description: 'as_of strictly increases per fund_id', status: 'pass' },
      { name: 'Returns derived', description: 'return_daily = nav_t / nav_{t-1} − 1 ± 1 bp', status: 'pass' },
      { name: 'Attestation chain', description: 'attestation_id chains to previous strike via TSSO', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['admin@apollo.com', 'compliance@securitize.io', 'oracle@redstone.finance'],
      webhook: 'https://hooks.securitize.io/hyve/nav-history',
    },
  },
  'position-pricing': {
    syncMethod: 'scheduled',
    schedule: 'Daily 18:00 ET · third-party mark window',
    lastSyncAt: hoursAgo(4),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(18, 0, 0, 0) + 86_400_000).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Provider coverage', description: '≥ 2 of {Houlihan, Lincoln, DLx} per Level 3 position', status: 'pass' },
      { name: 'Mark drift guard', description: 'price_change_bps within ±500 bps day-over-day', status: 'pass' },
      { name: 'Valuation committee', description: 'valuation_committee_approved = true for Level 3 marks', status: 'pass' },
      { name: 'pricing_level enum', description: 'pricing_level ∈ {L1, L2, L3}', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['valuations@apollo.com', 'risk@apollo.com'],
    },
  },
  'fund-master': {
    syncMethod: 'manual',
    schedule: 'On change',
    lastSyncAt: daysAgo(2),
    lastSyncStatus: 'ok',
    nextSyncAt: null,
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'LEI well-formed', description: 'master_fund_lei matches G20 LEI format', status: 'pass' },
      { name: 'Contract addresses checksummed', description: 'All EVM addresses pass EIP-55 checksum', status: 'pass' },
      { name: 'Fee bps in range', description: 'mgmt_fee_bps and perf_fee_bps ∈ [0, 5000]', status: 'pass' },
    ],
    freshnessThreshold: 'manual',
    notifications: {
      email: ['legal@securitize.io', 'mark.t@securitize.io'],
    },
  },
  'cash-positions': {
    syncMethod: 'scheduled',
    schedule: 'Hourly · cash; every 15m · flows',
    lastSyncAt: minsAgo(14),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setMinutes(new Date().getMinutes() + 46, 0, 0)).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Schema match', description: 'Inbound schema must match MT940 v2 + portal events v3', status: 'pass' },
      { name: 'Investor PII guard', description: 'investor_id must be private at ingest', status: 'pass' },
      { name: 'FX freshness', description: 'balance_usd_equiv FX rate ≤ 4 h old', status: 'pass' },
      { name: 'Freshness window', description: 'Last sync ≤ 1 h', status: 'pass' },
    ],
    freshnessThreshold: '1h',
    notifications: {
      email: ['ops@bny.com', 'treasury@apollo.com', 'mark.t@securitize.io'],
      webhook: 'https://hooks.securitize.io/hyve/cash',
    },
  },
  'capital-accounts': {
    syncMethod: 'manual',
    schedule: 'Quarterly · ILPA template',
    lastSyncAt: daysAgo(38),
    lastSyncStatus: 'ok',
    nextSyncAt: null,
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'ILPA v2.0 schema', description: 'File conforms to ILPA Reporting Template v2.0', status: 'pass' },
      { name: 'Ending = beginning + net activity', description: 'Capital account math reconciles ± 1 USD', status: 'pass' },
      { name: 'Tier minimum size', description: 'Each investor_tier rollup includes ≥ 10 investors', status: 'pass' },
    ],
    freshnessThreshold: '7d',
    notifications: {
      email: ['admin@apollo.com', 'compliance@securitize.io'],
    },
  },
  'risk-pack': {
    syncMethod: 'scheduled',
    schedule: 'Nightly 02:00 ET · derived',
    lastSyncAt: hoursAgo(5),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(2, 0, 0, 0) + 86_400_000).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Upstream loanbook fresh', description: 'loanbook last sync ≤ 24 h before risk pack run', status: 'pass' },
      { name: 'Top-N anonymized', description: 'top_1_borrower_pct never paired with obligor identity', status: 'pass' },
      { name: 'HHI bounded', description: 'industry_hhi and geographic_hhi ∈ [0, 10000]', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['risk@apollo.com', 'mark.t@securitize.io'],
      webhook: 'https://hooks.securitize.io/hyve/risk-pack',
    },
  },
  'accounting-ledger': {
    syncMethod: 'scheduled',
    schedule: 'Daily 06:30 ET · trial balance',
    lastSyncAt: hoursAgo(9),
    lastSyncStatus: 'ok',
    nextSyncAt: new Date(new Date().setHours(new Date().getHours() + 15, 30, 0, 0)).toISOString(),
    syncHistory: ['ok', 'ok', 'ok', 'warn', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'Trial balance ties', description: 'Σ assets = Σ liabilities + Σ equity ± 1 USD', status: 'pass' },
      { name: 'ILPA category enum', description: 'category ∈ ILPA v2.0 enum set', status: 'pass' },
      { name: 'NAV reconciliation', description: 'ledger.nav balance reconciles to nav-report total', status: 'pass' },
      { name: 'Freshness window', description: 'Last sync ≤ 24 h', status: 'pass' },
    ],
    freshnessThreshold: '24h',
    notifications: {
      email: ['accounting@ssc.com', 'compliance@securitize.io'],
    },
  },
  'reference-data': {
    syncMethod: 'manual',
    schedule: 'On change',
    lastSyncAt: daysAgo(7),
    lastSyncStatus: 'ok',
    nextSyncAt: null,
    syncHistory: ['ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok', 'ok'],
    validationRules: [
      { name: 'GICS taxonomy current', description: 'industry codes match published GICS revision', status: 'pass' },
      { name: 'CUSIP / ISIN checksums', description: 'All identifiers pass checksum validation', status: 'pass' },
      { name: 'Borrower PII guard', description: 'legal_name and lei must be private at ingest', status: 'pass' },
    ],
    freshnessThreshold: 'manual',
    notifications: {
      email: ['reference@apollo.com'],
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

const loanTapeAccess: DatasetAccess = {
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

const navHistoryAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: null,
  dpBudget: null,
  dpBudgetUsedPct: null,
  templates: [
    {
      id: 'qt_nav_per_share',
      name: 'NAV per share',
      description: 'Current NAV per share and total shares outstanding for a class.',
      inputs: [
        { name: 'as_of', type: 'date', required: false },
        { name: 'class_id', type: 'string', required: false },
      ],
      fields: ['nav_per_share', 'shares_outstanding', 'as_of', 'class_id'],
      resultShape: 'Scalar, 1 row per class',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 47,
    },
    {
      id: 'qt_period_returns',
      name: 'Period returns',
      description: 'Daily / MTD / QTD / YTD return at the chosen strike.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['return_daily', 'return_mtd', 'return_qtd', 'return_ytd'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 22,
    },
    {
      id: 'qt_nav_drift_check',
      name: 'NAV drift check',
      description: 'Period-over-period nav_per_share change with attestation chain reference.',
      inputs: [
        { name: 'window_days', type: 'number', required: false },
      ],
      fields: ['as_of', 'nav_per_share', 'attestation_id'],
      resultShape: 'Timeseries, 1 row per strike',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 11,
    },
    {
      id: 'qt_share_count_drift',
      name: 'Share count drift',
      description: 'Period-over-period change in shares outstanding.',
      inputs: [
        { name: 'periods', type: 'number', required: false },
      ],
      fields: ['shares_outstanding', 'as_of', 'class_id'],
      resultShape: 'Timeseries, 1 row per period',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 7,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_nav_per_share', 'qt_period_returns', 'qt_nav_drift_check', 'qt_share_count_drift'],
      rateLimit: '2,000 / day',
      validFrom: daysAgo(180),
      validUntil: null,
      status: 'active',
      runs7d: 47,
      lastActivityAt: '6 min ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_nav_per_share', 'qt_period_returns'],
      rateLimit: '500 / day',
      validFrom: daysAgo(90),
      validUntil: null,
      status: 'active',
      runs7d: 19,
      lastActivityAt: '1 h ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_nav_per_share'],
      rateLimit: '200 / day',
      validFrom: daysAgo(45),
      validUntil: null,
      status: 'active',
      runs7d: 7,
      lastActivityAt: '2 d ago',
    },
  ],
}

const positionPricingAccess: DatasetAccess = {
  privacyUnit: 'position_id',
  aggregationThreshold: 5,
  dpBudget: 1.0,
  dpBudgetUsedPct: 28,
  templates: [
    {
      id: 'qt_mark_drift_distribution',
      name: 'Mark drift distribution',
      description: 'Distribution of position price_change_bps over the trailing window.',
      inputs: [
        { name: 'window_days', type: 'number', required: true },
        { name: 'percentile_cuts', type: 'string', required: false },
      ],
      fields: ['price_change_bps', 'pricing_level'],
      resultShape: 'Aggregate, P10/P25/P50/P75/P90 rows',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 14,
    },
    {
      id: 'qt_provider_coverage',
      name: 'Pricing provider coverage',
      description: 'Share of Level 3 positions marked by each third-party provider.',
      inputs: [
        { name: 'mark_date', type: 'date', required: true },
      ],
      fields: ['third_party_provider', 'pricing_level'],
      resultShape: 'Aggregate, 1 row per provider',
      privacy: { aggregation: 5, differentialPrivacy: false },
      status: 'live',
      runs7d: 6,
    },
    {
      id: 'qt_mid_bid_offer_summary',
      name: 'Mid / bid / offer summary',
      description: 'Portfolio-level weighted mid / bid / offer.',
      inputs: [
        { name: 'mark_date', type: 'date', required: true },
      ],
      fields: ['bid', 'mid', 'offer'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 9,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_mark_drift_distribution', 'qt_provider_coverage', 'qt_mid_bid_offer_summary'],
      rateLimit: '1,000 / day',
      validFrom: daysAgo(150),
      validUntil: null,
      status: 'active',
      runs7d: 14,
      lastActivityAt: '22 min ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_mark_drift_distribution', 'qt_mid_bid_offer_summary'],
      rateLimit: '500 / day',
      validFrom: daysAgo(100),
      validUntil: null,
      status: 'active',
      runs7d: 6,
      lastActivityAt: '4 h ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_mark_drift_distribution'],
      rateLimit: '200 / day',
      validFrom: daysAgo(45),
      validUntil: daysFromNow(60),
      status: 'active',
      runs7d: 3,
      lastActivityAt: '1 d ago',
    },
  ],
}

const fundMasterAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: null,
  dpBudget: null,
  dpBudgetUsedPct: null,
  templates: [
    {
      id: 'qt_fund_identity',
      name: 'Fund identity',
      description: 'Fund name, manager, administrator, custodian, domicile — single-row identity card.',
      inputs: [],
      fields: ['fund_id', 'legal_name', 'manager', 'administrator', 'custodian', 'domicile'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 12,
    },
    {
      id: 'qt_share_class_registry',
      name: 'Share class registry',
      description: 'Tokenized share classes — one row per (fund, chain) deployment with contract address and fee terms.',
      inputs: [],
      fields: ['class_id', 'chain', 'contract_address', 'cusip', 'isin', 'mgmt_fee_bps', 'perf_fee_bps'],
      resultShape: 'Aggregate, 1 row per deployment',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 9,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_fund_identity', 'qt_share_class_registry'],
      rateLimit: '50 / day',
      validFrom: daysAgo(120),
      validUntil: null,
      status: 'active',
      runs7d: 9,
      lastActivityAt: '2 h ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_fund_identity', 'qt_share_class_registry'],
      rateLimit: '20 / day',
      validFrom: daysAgo(90),
      validUntil: null,
      status: 'active',
      runs7d: 4,
      lastActivityAt: '8 h ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_share_class_registry'],
      rateLimit: '20 / day',
      validFrom: daysAgo(45),
      validUntil: null,
      status: 'active',
      runs7d: 3,
      lastActivityAt: '1 d ago',
    },
  ],
}

const cashPositionsAccess: DatasetAccess = {
  privacyUnit: 'investor_id',
  aggregationThreshold: 5,
  dpBudget: 1.5,
  dpBudgetUsedPct: 33,
  templates: [
    {
      id: 'qt_cash_by_account_type',
      name: 'Cash by account type',
      description: 'Aggregate USD-equivalent cash by account type and custodian.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['account_type', 'custodian', 'balance_usd_equiv'],
      resultShape: 'Aggregate, 1 row per (account_type, custodian)',
      privacy: { aggregation: 1, differentialPrivacy: true },
      status: 'live',
      runs7d: 22,
    },
    {
      id: 'qt_flows_by_tier_and_type',
      name: 'Flows by tier and type',
      description: 'Daily flow volumes grouped by investor tier and flow type.',
      inputs: [
        { name: 'from_date', type: 'date', required: true },
        { name: 'to_date', type: 'date', required: true },
      ],
      fields: ['flow_date', 'flow_type', 'investor_tier', 'gross_amount_usd'],
      resultShape: 'Aggregate, 1 row per (flow_date, flow_type, investor_tier)',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 17,
    },
    {
      id: 'qt_redemption_pressure',
      name: 'Redemption pressure',
      description: 'Outstanding redemptions vs. operating cash buffer over the trailing window.',
      inputs: [
        { name: 'window_days', type: 'number', required: false },
      ],
      fields: ['flow_type', 'gross_amount_usd', 'balance_usd_equiv'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: 5, differentialPrivacy: false },
      status: 'live',
      runs7d: 8,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_cash_by_account_type', 'qt_flows_by_tier_and_type', 'qt_redemption_pressure'],
      rateLimit: '500 / day',
      validFrom: daysAgo(120),
      validUntil: null,
      status: 'active',
      runs7d: 22,
      lastActivityAt: '14 min ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_cash_by_account_type', 'qt_redemption_pressure'],
      rateLimit: '200 / day',
      validFrom: daysAgo(80),
      validUntil: null,
      status: 'active',
      runs7d: 11,
      lastActivityAt: '1 h ago',
    },
  ],
}

const capitalAccountsAccess: DatasetAccess = {
  privacyUnit: 'investor_id',
  aggregationThreshold: 10,
  dpBudget: 0.8,
  dpBudgetUsedPct: 12,
  templates: [
    {
      id: 'qt_capital_rollup_by_tier',
      name: 'Capital rollup by tier',
      description: 'ILPA-format capital account rollup by investor tier for a reporting period.',
      inputs: [
        { name: 'period', type: 'date', required: true },
      ],
      fields: ['investor_tier', 'beginning_balance', 'contributions', 'distributions_recallable', 'distributions_non_recallable', 'ending_balance'],
      resultShape: 'Aggregate, 1 row per investor tier',
      privacy: { aggregation: 10, differentialPrivacy: true },
      status: 'live',
      runs7d: 5,
    },
    {
      id: 'qt_realized_unrealized_pnl',
      name: 'Realized vs. unrealized P&L',
      description: 'Period realized and unrealized gain/loss allocation by tier.',
      inputs: [
        { name: 'period', type: 'date', required: true },
      ],
      fields: ['investor_tier', 'realized_gain_loss', 'unrealized_gain_loss'],
      resultShape: 'Aggregate, 1 row per investor tier',
      privacy: { aggregation: 10, differentialPrivacy: true },
      status: 'live',
      runs7d: 3,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_capital_rollup_by_tier', 'qt_realized_unrealized_pnl'],
      rateLimit: '20 / day',
      validFrom: daysAgo(90),
      validUntil: null,
      status: 'active',
      runs7d: 5,
      lastActivityAt: '5 h ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_capital_rollup_by_tier'],
      rateLimit: '10 / day',
      validFrom: daysAgo(60),
      validUntil: null,
      status: 'active',
      runs7d: 2,
      lastActivityAt: '1 d ago',
    },
  ],
}

const riskPackAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: 5,
  dpBudget: 1.0,
  dpBudgetUsedPct: 51,
  templates: [
    {
      id: 'qt_top_n_concentration',
      name: 'Top-N concentration',
      description: 'Pre-aggregated top-1 / top-5 / top-10 borrower exposure as a share of NAV.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['top_1_borrower_pct', 'top_5_borrower_pct', 'top_10_borrower_pct'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 41,
    },
    {
      id: 'qt_industry_geographic_hhi',
      name: 'Industry + geographic HHI',
      description: 'Herfindahl-Hirschman concentration indices for industry and country.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['industry_hhi', 'geographic_hhi'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 28,
    },
    {
      id: 'qt_portfolio_risk_stats',
      name: 'Portfolio risk statistics',
      description: 'WAL / WAS / weighted internal rating across the portfolio.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['wal_years', 'was_bps', 'wac_bps', 'weighted_internal_rating', 'pct_default_or_watchlist'],
      resultShape: 'Scalar, 1 row',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 19,
    },
    {
      id: 'qt_rating_distribution',
      name: 'Rating distribution',
      description: 'Position-count and fair-value share by rating bucket.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['rating_bucket', 'position_count', 'pct_fair_value'],
      resultShape: 'Aggregate, 1 row per rating bucket',
      privacy: { aggregation: 5, differentialPrivacy: true },
      status: 'live',
      runs7d: 14,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_top_n_concentration', 'qt_industry_geographic_hhi', 'qt_portfolio_risk_stats', 'qt_rating_distribution'],
      rateLimit: '2,000 / day',
      validFrom: daysAgo(150),
      validUntil: null,
      status: 'active',
      runs7d: 41,
      lastActivityAt: '4 min ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_top_n_concentration', 'qt_industry_geographic_hhi', 'qt_portfolio_risk_stats'],
      rateLimit: '1,000 / day',
      validFrom: daysAgo(100),
      validUntil: null,
      status: 'active',
      runs7d: 22,
      lastActivityAt: '32 min ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_top_n_concentration', 'qt_industry_geographic_hhi'],
      rateLimit: '500 / day',
      validFrom: daysAgo(60),
      validUntil: null,
      status: 'active',
      runs7d: 8,
      lastActivityAt: '3 h ago',
    },
  ],
}

const accountingLedgerAccess: DatasetAccess = {
  privacyUnit: null,
  aggregationThreshold: 1,
  dpBudget: 0.5,
  dpBudgetUsedPct: 22,
  templates: [
    {
      id: 'qt_typed_balance_sheet',
      name: 'Typed-account balance sheet',
      description: 'Balances by account_type and account_subtype at a point in time.',
      inputs: [
        { name: 'as_of', type: 'date', required: true },
      ],
      fields: ['account_type', 'account_subtype', 'balance'],
      resultShape: 'Aggregate, 1 row per (account_type, account_subtype)',
      privacy: { aggregation: 1, differentialPrivacy: false },
      status: 'live',
      runs7d: 13,
    },
    {
      id: 'qt_fee_expense_summary',
      name: 'Fee & expense summary',
      description: 'ILPA v2.0 fee and expense categories for a reporting period.',
      inputs: [
        { name: 'period', type: 'date', required: true },
      ],
      fields: ['category', 'amount_usd', 'paid_to_affiliate'],
      resultShape: 'Aggregate, 1 row per ILPA category',
      privacy: { aggregation: 1, differentialPrivacy: false },
      status: 'live',
      runs7d: 7,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_typed_balance_sheet', 'qt_fee_expense_summary'],
      rateLimit: '200 / day',
      validFrom: daysAgo(120),
      validUntil: null,
      status: 'active',
      runs7d: 13,
      lastActivityAt: '1 h ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_typed_balance_sheet'],
      rateLimit: '100 / day',
      validFrom: daysAgo(60),
      validUntil: null,
      status: 'active',
      runs7d: 4,
      lastActivityAt: '12 h ago',
    },
  ],
}

const referenceDataAccess: DatasetAccess = {
  privacyUnit: 'borrower_id',
  aggregationThreshold: null,
  dpBudget: null,
  dpBudgetUsedPct: null,
  templates: [
    {
      id: 'qt_gics_lookup',
      name: 'GICS taxonomy lookup',
      description: 'GICS 4-level industry classification reference.',
      inputs: [
        { name: 'gics_code', type: 'string', required: false },
      ],
      fields: ['gics_code', 'sector', 'industry_group', 'industry', 'sub_industry'],
      resultShape: 'Aggregate, 1 row per gics_code',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 14,
    },
    {
      id: 'qt_instrument_lookup',
      name: 'Instrument identifier lookup',
      description: 'CUSIP / ISIN reference for any registered tranche.',
      inputs: [
        { name: 'cusip', type: 'string', required: false },
        { name: 'isin', type: 'string', required: false },
      ],
      fields: ['cusip', 'isin', 'instrument_name', 'instrument_type', 'currency'],
      resultShape: 'Aggregate, 1 row per instrument',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 6,
    },
    {
      id: 'qt_borrower_classification',
      name: 'Borrower classification',
      description: 'Anonymized borrower classification — match key, industry, country, sponsor flag. Identity fields blocked.',
      inputs: [
        { name: 'borrower_id', type: 'string', required: true },
      ],
      fields: ['borrower_id', 'industry_gics', 'country', 'is_sponsored', 'sponsor_tier'],
      resultShape: 'Aggregate, 1 row per borrower_id',
      privacy: { aggregation: null, differentialPrivacy: false },
      status: 'live',
      runs7d: 38,
    },
  ],
  grants: [
    {
      counterparty: 'Gauntlet',
      templateIds: ['qt_gics_lookup', 'qt_instrument_lookup', 'qt_borrower_classification'],
      rateLimit: '5,000 / day',
      validFrom: daysAgo(180),
      validUntil: null,
      status: 'active',
      runs7d: 38,
      lastActivityAt: '90s ago',
    },
    {
      counterparty: 'Morpho',
      templateIds: ['qt_gics_lookup', 'qt_borrower_classification'],
      rateLimit: '2,000 / day',
      validFrom: daysAgo(140),
      validUntil: null,
      status: 'active',
      runs7d: 17,
      lastActivityAt: '40 min ago',
    },
    {
      counterparty: 'Aave V4',
      templateIds: ['qt_gics_lookup'],
      rateLimit: '1,000 / day',
      validFrom: daysAgo(45),
      validUntil: null,
      status: 'active',
      runs7d: 5,
      lastActivityAt: '6 h ago',
    },
  ],
}

export const datasetAccess: Record<string, DatasetAccess> = {
  'fund-master': fundMasterAccess,
  'nav-history': navHistoryAccess,
  'loan-tape': loanTapeAccess,
  'position-pricing': positionPricingAccess,
  'cash-positions': cashPositionsAccess,
  'capital-accounts': capitalAccountsAccess,
  'risk-pack': riskPackAccess,
  'accounting-ledger': accountingLedgerAccess,
  'reference-data': referenceDataAccess,
}

/** Roll-up counts across every dataset — used by the vault policy panel. */
export interface VaultPolicySummary {
  totalFields: number
  counts: Record<PrivacyLevel, number>
  examples: Record<PrivacyLevel, string[]>
}

export function computeVaultPolicy(): VaultPolicySummary {
  const counts: Record<PrivacyLevel, number> = {
    private: 0,
    join: 0,
    aggregate: 0,
    dimension: 0,
    select: 0,
  }
  const examples: Record<PrivacyLevel, string[]> = {
    private: [],
    join: [],
    aggregate: [],
    dimension: [],
    select: [],
  }
  // Use the real total of each dataset (not just sampled fields) by
  // extrapolating from the sampled mix.
  let totalFields = 0
  for (const ds of datasets) {
    totalFields += ds.fieldCount
    const sampled = ds.fields
    const sampleSize = sampled.length || 1
    const byTier: Record<PrivacyLevel, number> = {
      private: 0, join: 0, aggregate: 0, dimension: 0, select: 0,
    }
    for (const f of sampled) byTier[f.privacy]++
    const scale = ds.fieldCount / sampleSize
    for (const tier of Object.keys(byTier) as PrivacyLevel[]) {
      counts[tier] += Math.round(byTier[tier] * scale)
    }
    for (const f of sampled) {
      if (examples[f.privacy].length < 6) examples[f.privacy].push(f.name)
    }
  }
  return { totalFields, counts, examples }
}
