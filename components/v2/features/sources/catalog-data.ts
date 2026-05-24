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
  trust?: {
    reads: string
    storage: string
    audit: string
    revoke: string
  }
}

export type WordmarkTone = 'ink' | 'navy' | 'teal' | 'red' | 'blue' | 'amber' | 'orange' | 'violet'

export const WORDMARK_TONES: Record<WordmarkTone, string> = {
  ink: 'bg-v2-foreground text-v2-background',
  navy: 'bg-[#1a2238] text-[#e8ebf3]',
  teal: 'bg-[#0d4f4a] text-[#e7f0ee]',
  red: 'bg-[#5d1a1a] text-[#f0e6e6]',
  blue: 'bg-[#1c2f5a] text-[#e6ebf5]',
  amber: 'bg-[#5a4a18] text-[#f0ead0]',
  orange: 'bg-[#5a2e16] text-[#f5e2d2]',
  violet: 'bg-[#2d1c4a] text-[#e8e2f5]',
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
  payments: 'Payments',
  banking: 'Banking',
  accounting: 'Accounting',
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
    wired: 'wired', logo: { kind: 'wordmark', label: 'SEC', tone: 'navy' },
    trust: {
      reads: 'Public filings: Form N-PORT, N-CSR, N-CEN, N-2, XBRL financials · read-only',
      storage: 'Cached in confidential enclave. Hyve operators cannot read raw filings.',
      audit: 'Every fetch hashed and written to ledger.',
      revoke: 'Disconnect from Sources. Cached data purged within 24h.',
    } },
  { id: 'cftc', category: 'regulator', name: 'CFTC filings', tagline: 'Derivatives regulator',
    wired: 'soon', logo: { kind: 'wordmark', label: 'CFTC', tone: 'navy' } },

  // Storage
  { id: 's3', category: 'storage', name: 'Amazon S3', tagline: 'Object storage',
    wired: 'wired', logo: { kind: 'wordmark', label: 'S3', tone: 'orange' },
    trust: {
      reads: 'Objects under the prefix you grant · read-only · ListObjects + GetObject',
      storage: 'Streamed into a confidential enclave. Hyve operators cannot read raw bytes.',
      audit: 'SHA-256 of every object read written to ledger. Counterparty access logged.',
      revoke: 'Disconnect or rotate the IAM credentials. Effective immediately.',
    } },
  { id: 'gcs', category: 'storage', name: 'Google Cloud Storage', tagline: 'Object storage',
    wired: 'soon', logo: { kind: 'wordmark', label: 'GCS', tone: 'blue' } },
  { id: 'azure-blob', category: 'storage', name: 'Azure Blob', tagline: 'Object storage',
    wired: 'soon', logo: { kind: 'wordmark', label: 'AZ', tone: 'blue' } },
  { id: 'sftp', category: 'storage', name: 'SFTP', tagline: 'Secure file transfer',
    wired: 'soon', logo: { kind: 'wordmark', label: 'FTP', tone: 'ink' } },
  { id: 'file-upload', category: 'storage', name: 'File upload', tagline: 'CSV · Parquet · JSON',
    wired: 'wired', logo: { kind: 'icon', Icon: FileUp },
    trust: {
      reads: 'Only the files you upload. No background polling.',
      storage: 'Stored in confidential enclave. Hyve operators cannot read raw rows.',
      audit: 'File hash and column count written to ledger at upload time.',
      revoke: 'Delete the source from Sources. Files purged within 24h.',
    } },

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
]

export function connectorById(id: string): ConnectorDefinition | undefined {
  return CATALOG.find((c) => c.id === id)
}

export function connectorsByCategory(category: ConnectorCategory): ConnectorDefinition[] {
  return CATALOG.filter((c) => c.category === category)
}

export const CATEGORY_ORDER: ConnectorCategory[] = [
  'payments', 'banking', 'accounting',
  'fund-admin', 'regulator', 'storage', 'warehouse',
  'on-chain', 'market-data', 'rating-agency', 'agent-bank',
  'analytics', 'custom',
]
