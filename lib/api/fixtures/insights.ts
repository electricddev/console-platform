import type { AIInsight } from '@/lib/api/types'

export const insightFixtures: AIInsight[] = [
  {
    id: 'ins_001',
    generatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    claim: 'Vintage Q3-2025 in mF-ONE shows declining advance rate; concentration breach predicted within 14 days.',
    evidenceRunIds: ['run_4821', 'run_4822'],
    severity: 'warning',
    suggestedAction: { label: 'Run concentration check', href: '/templates/tpl_concentration_breaches/run' },
  },
  {
    id: 'ins_002',
    generatedAt: new Date(Date.now() - 50 * 60_000).toISOString(),
    claim: 'CreditBridge EU MidMarket completeness held at 100% for 9 consecutive days — strong consistency vs peers.',
    evidenceRunIds: ['run_4823'],
    severity: 'info',
  },
  {
    id: 'ins_003',
    generatedAt: new Date(Date.now() - 200 * 60_000).toISOString(),
    claim: 'FlowCredit APAC ingestion paused by originator — revisit when schema v2 is signed.',
    evidenceRunIds: ['run_4820'],
    severity: 'critical',
    suggestedAction: { label: 'View dataset', href: '/datasets/ds_flowcredit_apac' },
  },
]
