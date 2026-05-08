import type { Webhook } from '@/lib/api/types'

export const webhookFixtures: Webhook[] = [
  { id: 'wh_1', url: 'https://gauntlet.xyz/hooks/hyve', events: ['run.completed', 'attestation.published'], active: true, createdAt: '2025-09-01T10:00:00Z', failureCount: 0 },
]
