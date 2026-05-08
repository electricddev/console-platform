import type { Notebook } from '@/lib/api/types'

export const notebookFixtures: Notebook[] = [
  {
    id: 'nb_q2_credit_memo',
    title: 'Q2 2026 mF-ONE credit memo',
    description: 'IC-ready review of mF-ONE performance, vintage health, and concentration.',
    authorId: 'usr_maya',
    authorOrgId: 'org_gauntlet',
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-05-06T14:00:00Z',
    cells: [
      { id: 'c1', kind: 'markdown', markdown: '# Executive summary\n\nWe are recommending a position increase of $10M.' },
      { id: 'c2', kind: 'query', dsl: 'SELECT weighted_avg(advance_rate, principal) FROM loans GROUP BY sector', parameters: {}, runId: 'run_4821' },
      { id: 'c3', kind: 'visualization', runId: 'run_4822', shape: 'line' },
      { id: 'c4', kind: 'attestation', runIds: ['run_4821', 'run_4822'] },
    ],
  },
]
