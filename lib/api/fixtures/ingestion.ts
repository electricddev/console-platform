import type { IngestionEvent } from '@/lib/api/types'

const ts = (offsetMin: number) => new Date(Date.now() - offsetMin * 60_000).toISOString()

export const ingestionFixtures: IngestionEvent[] = Array.from({ length: 24 }, (_, i) => ({
  id: `ing_${i + 1}`,
  sourceId: 'src_mfone_pg',
  timestamp: ts(i * 60),
  recordCount: 600 + Math.floor(Math.random() * 60),
  commitHash: '0x' + Math.random().toString(16).slice(2, 18).padEnd(64, '0'),
  outcome: i === 14 ? 'partial' : 'committed',
  error: i === 14 ? 'Streaming gap detected at 14:00 UTC; auto-recovered.' : undefined,
}))
