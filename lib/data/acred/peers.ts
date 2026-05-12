import type { PeerDispersionRow } from '@/lib/api/schemas'

export const acredPeerDispersion: PeerDispersionRow[] = [
  {
    borrowerNormalized: 'software co a', dispersionPoints: 1.6,
    commentary: 'Apollo mark at low end — investigate or accept',
    marks: [
      { fund: 'ACRED', mark: 98.2, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
      { fund: 'ARCC',  mark: 99.1, lastUpdated: '2026-03-25T00:00:00.000Z', hyveVerified: false },
      { fund: 'OBDC',  mark: 97.5, lastUpdated: '2026-04-09T00:00:00.000Z', hyveVerified: false },
    ],
  },
  {
    borrowerNormalized: 'industrials borrower b', dispersionPoints: 0.8,
    commentary: null,
    marks: [
      { fund: 'ACRED', mark: 99.4, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
      { fund: 'ARCC',  mark: 100.2, lastUpdated: '2026-03-25T00:00:00.000Z', hyveVerified: false },
    ],
  },
  {
    borrowerNormalized: 'healthcare borrower c', dispersionPoints: 2.3,
    commentary: 'Largest peer dispersion in the top-10',
    marks: [
      { fund: 'ACRED', mark: 96.1, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
      { fund: 'ARCC',  mark: 98.4, lastUpdated: '2026-03-25T00:00:00.000Z', hyveVerified: false },
      { fund: 'OBDC',  mark: 97.0, lastUpdated: '2026-04-09T00:00:00.000Z', hyveVerified: false },
      { fund: 'BBDC',  mark: 98.0, lastUpdated: '2026-03-30T00:00:00.000Z', hyveVerified: false },
    ],
  },
]
