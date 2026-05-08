import type { Source } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const sourceFixtures: Source[] = [
  {
    id: 'src_mfone_pg',
    name: 'mF-ONE Postgres',
    type: 'postgres',
    ownerOrgId: 'org_tradefin',
    recordsProcessed: 14_823,
    lastCommitAt: ts(2),
    lagSeconds: 8,
    completenessPct: 0.99,
    status: 'healthy',
    agentVersion: '1.4.2',
    agentInstalledAt: '2025-09-01T12:00:00Z',
  },
  {
    id: 'src_flowapac_s3',
    name: 'FlowCredit APAC S3 drop',
    type: 's3',
    ownerOrgId: 'org_tradefin',
    recordsProcessed: 6_322,
    lastCommitAt: ts(540),
    lagSeconds: 32_400,
    completenessPct: 0.91,
    status: 'paused',
    agentVersion: '1.4.0',
    agentInstalledAt: '2025-10-15T09:00:00Z',
  },
  {
    id: 'src_creditbridge_pg',
    name: 'CreditBridge Postgres',
    type: 'postgres',
    ownerOrgId: 'org_creditbridge',
    recordsProcessed: 487,
    lastCommitAt: ts(180),
    lagSeconds: 60,
    completenessPct: 1.0,
    status: 'healthy',
    agentVersion: '1.4.2',
    agentInstalledAt: '2025-08-12T14:00:00Z',
  },
]
