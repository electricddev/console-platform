import type { AnomalyEvent } from '@/lib/api/schemas'

/**
 * Pre-computed anomaly feed for ACRED. Derived from credit_events ∩ holdings.
 * Refresh when parquet changes; the unit test guards shape, not contents.
 */
export const acredAnomalyFeed: AnomalyEvent[] = [
  {
    id: 'evt_2026_q1_filed',
    occurredAt: '2026-04-29T00:00:00.000Z',
    kind: 'filing', severity: 'info',
    title: 'Q1 2026 N-PORT filed — 308 holdings, 14 new positions',
    borrowerNormalized: null,
    detailHref: '/datasets/ds_acred/runs',
  },
  {
    id: 'evt_software_co_1',
    occurredAt: '2026-04-22T00:00:00.000Z',
    kind: 'credit-event', severity: 'high',
    title: '8-K item 1.03 — bankruptcy filing',
    borrowerNormalized: 'software co a',
    detailHref: '/datasets/ds_acred/explore?table=credit_events&where=severity%3D%27high%27',
  },
  {
    id: 'evt_software_co_2',
    occurredAt: '2026-04-08T00:00:00.000Z',
    kind: 'credit-event', severity: 'medium',
    title: '8-K item 2.04 — material covenant breach disclosed',
    borrowerNormalized: 'software co b',
    detailHref: '/datasets/ds_acred/explore?table=credit_events',
  },
]
