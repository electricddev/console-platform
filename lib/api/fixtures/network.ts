import type { NetworkHealth } from '@/lib/api/types'

export const networkHealthFixture: NetworkHealth = {
  teeStatus: 'healthy',
  anchorStatus: 'healthy',
  anchorLatencyMs: 1820,
  ingestionStatus: 'healthy',
  updatedAt: new Date().toISOString(),
}
