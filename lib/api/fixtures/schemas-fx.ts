import type { Schema } from '@/lib/api/types'

export const schemaFixtures: Schema[] = [
  {
    id: 'sch_mfone_v3',
    datasetId: 'ds_mfone',
    version: 3,
    publishedAt: '2026-04-12T10:00:00Z',
    signedBy: 'usr_tom',
    signedAt: '2026-04-12T10:00:00Z',
    changeSummary: 'Added borrower_segment as enum, retired raw advance_rate.',
    policy: {
      kAnonymity: 10,
      maxQueriesPerCounterpartyPerDay: 200,
      allowedTimeRanges: ['2024-01-01..now'],
    },
    fields: [
      { name: 'loan_id', type: 'string', exposure: 'private', isPii: true, description: 'Internal loan identifier' },
      { name: 'sector', type: 'enum', exposure: 'queryable', isPii: false, description: 'Industry sector', allowedOperators: ['count'] },
      { name: 'principal', type: 'currency', exposure: 'aggregated-only', isPii: false, description: 'Original loan principal (USD)', minBucketSize: 10, allowedOperators: ['sum', 'avg', 'count'] },
      { name: 'advance_rate', type: 'number', exposure: 'aggregated-only', isPii: false, description: 'LTV at advance', minBucketSize: 10, allowedOperators: ['avg', 'min', 'max'] },
      { name: 'origination_date', type: 'date', exposure: 'queryable', isPii: false, description: 'Date the loan was advanced' },
      { name: 'borrower_segment', type: 'enum', exposure: 'queryable', isPii: false, description: 'SME / corporate / midmarket', allowedOperators: ['count'] },
      { name: 'days_past_due', type: 'number', exposure: 'aggregated-only', isPii: false, description: 'DPD bucket counter', minBucketSize: 10, allowedOperators: ['avg', 'count'] },
      { name: 'as_of_date', type: 'date', exposure: 'queryable', isPii: false },
    ],
  },
  {
    id: 'sch_creditbridge_v2',
    datasetId: 'ds_creditbridge',
    version: 2,
    publishedAt: '2026-03-30T08:00:00Z',
    signedBy: 'usr_tom',
    signedAt: '2026-03-30T08:00:00Z',
    policy: { kAnonymity: 25, maxQueriesPerCounterpartyPerDay: 50 },
    fields: [
      { name: 'deal_id', type: 'string', exposure: 'private', isPii: true },
      { name: 'country', type: 'enum', exposure: 'queryable', isPii: false, allowedOperators: ['count'] },
      { name: 'industry', type: 'enum', exposure: 'queryable', isPii: false, allowedOperators: ['count'] },
      { name: 'commitment', type: 'currency', exposure: 'aggregated-only', isPii: false, minBucketSize: 25, allowedOperators: ['sum', 'avg'] },
      { name: 'maturity_quarters', type: 'number', exposure: 'aggregated-only', isPii: false, minBucketSize: 25, allowedOperators: ['avg'] },
      { name: 'default_flag', type: 'bool', exposure: 'aggregated-only', isPii: false, minBucketSize: 25, allowedOperators: ['count', 'avg'] },
    ],
  },
]
