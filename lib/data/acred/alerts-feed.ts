import type { AnomalyEvent } from '@/lib/api/schemas'

const t = (offsetHours: number) =>
  new Date(Date.now() - offsetHours * 3_600_000).toISOString()

export const peerAnomalyEvents: AnomalyEvent[] = [
  { id: 'evt_mfone_1', occurredAt: t(2),   kind: 'filing',          severity: 'info',   title: 'Daily attestation delivered',                              borrowerNormalized: null,             detailHref: '/datasets/ds_mfone/runs'         },
  { id: 'evt_mfone_2', occurredAt: t(20),  kind: 'credit-event',    severity: 'low',    title: 'Borrower X covenant waiver granted',                       borrowerNormalized: 'borrower x',     detailHref: '/datasets/ds_mfone/explore'      },
  { id: 'evt_mfone_3', occurredAt: t(48),  kind: 'attestation-gap', severity: 'medium', title: 'Weekly leverage attestation late (37 min)',                 borrowerNormalized: null,             detailHref: '/datasets/ds_mfone'              },
  { id: 'evt_mfone_4', occurredAt: t(96),  kind: 'filing',          severity: 'info',   title: 'Monthly composition published',                            borrowerNormalized: null,             detailHref: '/datasets/ds_mfone/runs'         },

  { id: 'evt_jaaa_1',  occurredAt: t(4),   kind: 'filing',          severity: 'info',   title: 'Hourly NAV attested',                                      borrowerNormalized: null,             detailHref: '/datasets/ds_jaaa'               },
  { id: 'evt_jaaa_2',  occurredAt: t(36),  kind: 'credit-event',    severity: 'medium', title: 'CLO tranche B downgraded by S&P',                          borrowerNormalized: 'clo tranche b',  detailHref: '/datasets/ds_jaaa/explore'       },
  { id: 'evt_jaaa_3',  occurredAt: t(72),  kind: 'attestation-gap', severity: 'low',    title: 'Weekly composition delivered 6 min late',                  borrowerNormalized: null,             detailHref: '/datasets/ds_jaaa'               },
  { id: 'evt_jaaa_4',  occurredAt: t(120), kind: 'filing',          severity: 'info',   title: 'Q1 prospectus update filed',                               borrowerNormalized: null,             detailHref: '/datasets/ds_jaaa/runs'          },

  { id: 'evt_fasa_1',  occurredAt: t(1),   kind: 'filing',          severity: 'info',   title: 'Hourly invoice batch attested',                            borrowerNormalized: null,             detailHref: '/datasets/ds_fasanara'           },
  { id: 'evt_fasa_2',  occurredAt: t(28),  kind: 'credit-event',    severity: 'high',   title: 'Counterparty Y default disclosed (3.2% exposure)',         borrowerNormalized: 'counterparty y', detailHref: '/datasets/ds_fasanara/explore'   },
  { id: 'evt_fasa_3',  occurredAt: t(60),  kind: 'attestation-gap', severity: 'low',    title: 'Daily attestation delivered 12 min late',                  borrowerNormalized: null,             detailHref: '/datasets/ds_fasanara'           },
  { id: 'evt_fasa_4',  occurredAt: t(168), kind: 'filing',          severity: 'info',   title: 'Weekly portfolio summary published',                       borrowerNormalized: null,             detailHref: '/datasets/ds_fasanara/runs'      },

  { id: 'evt_ams_1',   occurredAt: t(6),   kind: 'attestation-gap', severity: 'high',   title: 'Weekly leverage attestation missed SLA',                   borrowerNormalized: null,             detailHref: '/datasets/ds_ams_credit'         },
  { id: 'evt_ams_2',   occurredAt: t(54),  kind: 'credit-event',    severity: 'high',   title: 'Software Co Z 8-K item 1.03 bankruptcy',                   borrowerNormalized: 'software co z',  detailHref: '/datasets/ds_ams_credit/explore' },
  { id: 'evt_ams_3',   occurredAt: t(96),  kind: 'credit-event',    severity: 'medium', title: 'PIK trigger crossed on Borrower Q',                        borrowerNormalized: 'borrower q',     detailHref: '/datasets/ds_ams_credit/explore' },
  { id: 'evt_ams_4',   occurredAt: t(144), kind: 'filing',          severity: 'info',   title: 'Q1 2026 N-PORT filed',                                     borrowerNormalized: null,             detailHref: '/datasets/ds_ams_credit/runs'    },
]
