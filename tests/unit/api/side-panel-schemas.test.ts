import { describe, it, expect } from 'vitest'
import {
  PeerMarkSchema, PeerDispersionRowSchema,
  AttestationDisciplineSchema, AmmFeedSchema,
} from '@/lib/api/schemas'

describe('PeerDispersionRowSchema', () => {
  it('parses', () => {
    const row = {
      borrowerNormalized: 'borrower x', dispersionPoints: 1.6, commentary: null,
      marks: [
        { fund: 'ACRED', mark: 98.2, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: true },
        { fund: 'ARCC', mark: 99.1, lastUpdated: '2026-04-01T00:00:00.000Z', hyveVerified: false },
      ],
    }
    expect(PeerDispersionRowSchema.parse(row).marks.length).toBe(2)
    expect(() => PeerMarkSchema.parse(row.marks[0])).not.toThrow()
  })
})

describe('AttestationDisciplineSchema', () => {
  it('parses', () => {
    expect(() => AttestationDisciplineSchema.parse({
      expectedLast30d: 30, deliveredLast30d: 30, onTimeLast30d: 28,
      lastGapAt: '2026-04-22T00:00:00.000Z',
      cadenceBreakdown: [
        { cadence: 'daily', metric: 'NAV', delivered: 30, expected: 30, onTime: 30 },
        { cadence: 'weekly', metric: 'leverage', delivered: 4, expected: 4, onTime: 3 },
      ],
    })).not.toThrow()
  })
})

describe('AmmFeedSchema', () => {
  it('parses', () => {
    expect(() => AmmFeedSchema.parse({
      navPerToken: 100.42, navCI95: 0.018, freshnessSeconds: 3,
      inventoryAsset: 4_200_000, inventoryQuote: 2_800_000,
      activeFeeBps: 12, feeBpsBaseline: 8, maxSwapSize: 850_000,
      capacityGate: 'confidence',
      last24h: { swapCount: 47, swapVolume: 1_800_000, revertCount: 0, sharpe: 2.4 },
      anomalyStream: [],
    })).not.toThrow()
  })
})
