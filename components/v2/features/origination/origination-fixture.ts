/**
 * Demo data for the Vaults page — modeled on the funds Securitize administers.
 * Each "vault" is a tokenized fund whose private data Hyve makes programmable
 * for counterparties (lenders, DeFi protocols, risk engines).
 */

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString()

export type VaultStatus = 'live' | 'syncing' | 'review' | 'paused'

export interface Vault {
  /** Slug used for routing */
  id: string
  /** Ticker / token symbol */
  symbol: string
  /** Full fund name */
  name: string
  /** Sponsor / issuer */
  sponsor: string
  /** Palette id from v2Palette */
  palette: 'forest' | 'periwinkle' | 'amber' | 'rose' | 'sky' | 'mauve' | 'teal'
  status: VaultStatus
  /** Net asset value, pre-formatted with $ and commas */
  nav: string
  /** Number of consumers (lenders, protocols) receiving views */
  consumers: number
  /** Number of feeds + uploads currently active */
  streams: number
  /** ISO timestamp of last sealed delivery */
  lastSealAt: string
}

export function findVault(id: string): Vault | undefined {
  return vaults.find((v) => v.id === id)
}

export const vaults: Vault[] = [
  {
    id: 'buidl',
    symbol: 'BUIDL',
    name: 'BlackRock USD Institutional Digital Liquidity',
    sponsor: 'BlackRock',
    palette: 'sky',
    status: 'live',
    nav: '$2,418,704,118',
    consumers: 14,
    streams: 6,
    lastSealAt: minsAgo(8),
  },
  {
    id: 'acred',
    symbol: 'ACRED',
    name: 'Apollo Diversified Credit Securitize Fund',
    palette: 'forest',
    sponsor: 'Apollo',
    status: 'live',
    nav: '$1,247,318,402',
    consumers: 9,
    streams: 8,
    lastSealAt: minsAgo(11),
  },
  {
    id: 'scope',
    symbol: 'SCOPE',
    name: 'Hamilton Lane Senior Credit Opportunities',
    sponsor: 'Hamilton Lane',
    palette: 'periwinkle',
    status: 'syncing',
    nav: '$684,902,001',
    consumers: 6,
    streams: 5,
    lastSealAt: minsAgo(2),
  },
  {
    id: 'kstr',
    symbol: 'KSTR',
    name: 'KKR Health Care Strategic Growth II',
    sponsor: 'KKR',
    palette: 'mauve',
    status: 'review',
    nav: '$412,118,773',
    consumers: 4,
    streams: 5,
    lastSealAt: hoursAgo(3),
  },
  {
    id: 'benji',
    symbol: 'BENJI',
    name: 'Franklin OnChain U.S. Government Money',
    sponsor: 'Franklin Templeton',
    palette: 'amber',
    status: 'live',
    nav: '$521,407,300',
    consumers: 11,
    streams: 4,
    lastSealAt: minsAgo(24),
  },
  {
    id: 'vbill',
    symbol: 'VBILL',
    name: 'VanEck Treasury Fund',
    sponsor: 'VanEck',
    palette: 'rose',
    status: 'paused',
    nav: '$184,210,914',
    consumers: 2,
    streams: 3,
    lastSealAt: daysAgo(2),
  },
]

export interface ActivityEvent {
  id: string
  at: string
  vaultId: string
  vaultSymbol: string
  actor: string
  action: string
}

export const activityFeed: ActivityEvent[] = [
  {
    id: 'evt-1',
    at: minsAgo(8),
    vaultId: 'buidl',
    vaultSymbol: 'BUIDL',
    actor: 'BNY Mellon',
    action: 'sealed holdings snapshot',
  },
  {
    id: 'evt-2',
    at: minsAgo(11),
    vaultId: 'acred',
    vaultSymbol: 'ACRED',
    actor: 'BNY Mellon',
    action: 'sealed holdings snapshot',
  },
  {
    id: 'evt-3',
    at: hoursAgo(2),
    vaultId: 'kstr',
    vaultSymbol: 'KSTR',
    actor: 'admin@apollo.com',
    action: 'submitted NAV report for review',
  },
  {
    id: 'evt-4',
    at: hoursAgo(5),
    vaultId: 'scope',
    vaultSymbol: 'SCOPE',
    actor: 'IHS Markit',
    action: 'ingested loan pricing',
  },
  {
    id: 'evt-5',
    at: daysAgo(1),
    vaultId: 'acred',
    vaultSymbol: 'ACRED',
    actor: 'mark.t@securitize.io',
    action: 'sealed April loan tape',
  },
  {
    id: 'evt-6',
    at: daysAgo(2),
    vaultId: 'benji',
    vaultSymbol: 'BENJI',
    actor: 'SEC EDGAR',
    action: 'ingested N-MFP Q1 2026',
  },
]
