import type { AccessGrant } from '@/lib/api/types'

export const accessFixtures: AccessGrant[] = [
  {
    id: 'agr_001',
    counterpartyOrgId: 'org_gauntlet',
    datasetId: 'ds_mfone',
    level: 'execute',
    rateLimitPerDay: 200,
    allowedTemplateIds: ['tpl_advance_rate_by_sector', 'tpl_concentration_breaches'],
    grantedAt: '2025-09-01T12:00:00Z',
    grantedBy: 'usr_tom',
  },
  {
    id: 'agr_002',
    counterpartyOrgId: 'org_infinifi',
    datasetId: 'ds_mfone',
    level: 'read',
    rateLimitPerDay: 50,
    allowedTemplateIds: [],
    grantedAt: '2025-11-15T08:00:00Z',
    grantedBy: 'usr_tom',
  },
  {
    id: 'agr_003',
    counterpartyOrgId: 'org_bitwise',
    datasetId: 'ds_creditbridge',
    level: 'execute',
    rateLimitPerDay: 100,
    allowedTemplateIds: ['tpl_default_rate_by_vintage'],
    expiresAt: '2026-12-31T23:59:59Z',
    grantedAt: '2026-01-10T10:00:00Z',
    grantedBy: 'usr_tom',
  },
]
