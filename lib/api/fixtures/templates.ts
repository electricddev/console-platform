import type { Template } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const templateFixtures: Template[] = [
  {
    id: 'tpl_advance_rate_by_sector',
    name: 'Weighted advance rate by sector',
    description: 'Principal-weighted advance rate, grouped by sector, with a minimum bucket size to satisfy k-anonymity.',
    authorId: 'usr_maya',
    authorOrgId: 'org_gauntlet',
    versionId: 'tplv_advance_rate_v3',
    versionNumber: 3,
    lastModifiedAt: ts(60 * 24),
    parameters: [
      { name: 'window_start', type: 'date', required: true, description: 'Start of measurement window' },
      { name: 'window_end', type: 'date', required: true },
      { name: 'min_bucket', type: 'number', required: true, defaultValue: 10, min: 5 },
    ],
    outputSchema: {
      shape: 'tabular',
      columns: [
        { name: 'sector', type: 'enum' },
        { name: 'advance_rate', type: 'number' },
        { name: 'bucket_size', type: 'number' },
      ],
    },
    dsl: `SELECT
  weighted_avg(advance_rate, principal) AS advance_rate,
  sector,
  count(*) AS bucket_size
FROM loans
WHERE as_of_date BETWEEN :window_start AND :window_end
GROUP BY sector
HAVING bucket_size >= :min_bucket;`,
    approvals: [
      { datasetId: 'ds_mfone', state: 'approved', approvedAt: ts(60 * 24 * 14), approverId: 'usr_tom', signature: '0x' + 'aa'.repeat(20) },
      { datasetId: 'ds_creditbridge', state: 'pending' },
    ],
    tags: ['credit-quality', 'underwriting'],
    compatibleAssetClasses: ['private-credit', 'trade-receivables'],
    archived: false,
    averageRuntimeMs: 1_840,
  },
  {
    id: 'tpl_concentration_breaches',
    name: 'Concentration breaches over rolling window',
    description: 'Detects sectors where exposure > 25% of pool over the rolling window.',
    authorId: 'usr_maya',
    authorOrgId: 'org_gauntlet',
    versionId: 'tplv_concentration_v1',
    versionNumber: 1,
    lastModifiedAt: ts(60 * 24 * 5),
    parameters: [
      { name: 'window_days', type: 'number', required: true, defaultValue: 90 },
      { name: 'threshold_pct', type: 'number', required: true, defaultValue: 0.25 },
    ],
    outputSchema: {
      shape: 'time-series',
      columns: [{ name: 'sector', type: 'string' }, { name: 'exposure_pct', type: 'number' }],
    },
    dsl: `SELECT as_of_date, sector, sum(principal)/sum(sum(principal)) OVER (PARTITION BY as_of_date) AS exposure_pct
FROM loans
WHERE as_of_date > now() - interval ':window_days days'
GROUP BY as_of_date, sector
HAVING exposure_pct > :threshold_pct;`,
    approvals: [
      { datasetId: 'ds_mfone', state: 'approved', approvedAt: ts(60 * 24 * 30), approverId: 'usr_tom' },
    ],
    tags: ['concentration', 'risk-limit'],
    compatibleAssetClasses: ['private-credit', 'trade-receivables'],
    archived: false,
    averageRuntimeMs: 2_910,
  },
  {
    id: 'tpl_default_rate_by_vintage',
    name: 'Default rate by vintage',
    description: 'Quarterly vintage default rate with confidence intervals.',
    authorId: 'usr_admin',
    authorOrgId: 'org_gauntlet',
    versionId: 'tplv_default_rate_v2',
    versionNumber: 2,
    lastModifiedAt: ts(60 * 12),
    parameters: [
      { name: 'lookback_quarters', type: 'number', required: true, defaultValue: 8 },
    ],
    outputSchema: {
      shape: 'tabular',
      columns: [
        { name: 'vintage', type: 'string' },
        { name: 'default_rate', type: 'number' },
        { name: 'ci_lo', type: 'number' },
        { name: 'ci_hi', type: 'number' },
      ],
    },
    dsl: `SELECT vintage, avg(default_flag) AS default_rate, ...
FROM loans
GROUP BY vintage
HAVING bucket_size >= 25;`,
    approvals: [
      { datasetId: 'ds_creditbridge', state: 'approved', approvedAt: ts(60 * 24 * 7), approverId: 'usr_tom' },
      { datasetId: 'ds_mfone', state: 'changes-requested', rationale: 'Reduce parameter range' },
    ],
    tags: ['default-rate', 'vintage'],
    compatibleAssetClasses: ['private-credit'],
    archived: false,
    averageRuntimeMs: 1_240,
  },
]
