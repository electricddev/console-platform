import type { CopilotThread } from '@/lib/api/types'

export const copilotFixtures: CopilotThread[] = [
  {
    id: 'th_001',
    title: 'mF-ONE concentration check',
    createdAt: '2026-05-07T09:00:00Z',
    updatedAt: '2026-05-07T09:08:00Z',
    messages: [
      { id: 'm1', role: 'user', text: 'Is mF-ONE in concentration breach right now?', createdAt: '2026-05-07T09:00:00Z', evidenceRunIds: [], toolCalls: [] },
      { id: 'm2', role: 'assistant', text: 'No. Industrials sits at 22.4% (threshold 25%). Trending up though — projected breach in ~14 days at current rate.', createdAt: '2026-05-07T09:00:08Z', evidenceRunIds: ['run_4822'], confidence: 0.91, toolCalls: [{ kind: 'execute-template', input: { templateId: 'tpl_concentration_breaches' }, output: { runId: 'run_4822' } }] },
    ],
  },
]
