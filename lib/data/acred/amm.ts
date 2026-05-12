import type { AmmFeed } from '@/lib/api/schemas'

export const acredAmmFeed: AmmFeed = {
  navPerToken: 100.42,
  navCI95: 0.018,
  freshnessSeconds: 3,
  inventoryAsset: 4_200_000,
  inventoryQuote: 2_800_000,
  activeFeeBps: 12,
  feeBpsBaseline: 8,
  maxSwapSize: 850_000,
  capacityGate: 'confidence',
  last24h: { swapCount: 47, swapVolume: 1_800_000, revertCount: 0, sharpe: 2.4 },
  anomalyStream: [
    {
      id: 'amm_sla_1',
      occurredAt: new Date(Date.now() - 2 * 60_000).toISOString(),
      kind: 'amm-sla', severity: 'medium',
      title: 'NAV freshness 62s > 60s SLA — max swap reduced to $400k',
      borrowerNormalized: null, detailHref: null,
    },
  ],
}
