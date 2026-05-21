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
