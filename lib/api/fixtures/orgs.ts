import type { Org } from '@/lib/api/types'

export const orgFixtures: Org[] = [
  {
    id: 'org_gauntlet',
    name: 'Gauntlet',
    websiteUrl: 'https://gauntlet.xyz',
    description: 'Risk modeling and curation for on-chain credit.',
    assetClasses: ['private-credit', 'trade-receivables'],
    verified: true,
  },
  {
    id: 'org_infinifi',
    name: 'InfiniFi',
    description: 'Yield infrastructure allocating depositor capital to RWAs.',
    assetClasses: ['private-credit', 't-bills', 'multi-asset'],
    verified: true,
  },
  {
    id: 'org_bitwise',
    name: 'Bitwise',
    description: 'Crypto asset manager.',
    assetClasses: ['t-bills', 'multi-asset'],
    verified: true,
  },
  {
    id: 'org_tradefin',
    name: 'Maple Trade Finance',
    description: 'Trade finance receivables originator.',
    assetClasses: ['trade-receivables', 'flow-credit'],
    verified: true,
  },
  {
    id: 'org_creditbridge',
    name: 'CreditBridge',
    description: 'Private credit originator focused on EU mid-market.',
    assetClasses: ['private-credit'],
    verified: true,
  },
  {
    id: 'org_apollo',
    name: 'Apollo',
    description: 'Tokenized diversified private credit fund (ACRED).',
    assetClasses: ['private-credit'],
    verified: true,
  },
]
