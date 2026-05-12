import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { PeerDispersionRowSchema, AttestationDisciplineSchema, AmmFeedSchema } from '@/lib/api/schemas'
import { acredPeerDispersion } from '@/lib/data/acred/peers'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'
import { acredAmmFeed } from '@/lib/data/acred/amm'

describe('acredPeerDispersion', () => {
  it('parses', () => expect(() => z.array(PeerDispersionRowSchema).parse(acredPeerDispersion)).not.toThrow())
  it('dispersion equals max(mark) - min(mark) per row', () => {
    acredPeerDispersion.forEach((row) => {
      const marks = row.marks.map((m) => m.mark)
      const dispersion = Math.max(...marks) - Math.min(...marks)
      expect(Math.abs(dispersion - row.dispersionPoints)).toBeLessThan(0.01)
    })
  })
})

describe('acredAttestationDiscipline', () => {
  it('parses', () => expect(() => AttestationDisciplineSchema.parse(acredAttestationDiscipline)).not.toThrow())
  it('onTime ≤ delivered ≤ expected', () => {
    expect(acredAttestationDiscipline.onTimeLast30d).toBeLessThanOrEqual(acredAttestationDiscipline.deliveredLast30d)
    expect(acredAttestationDiscipline.deliveredLast30d).toBeLessThanOrEqual(acredAttestationDiscipline.expectedLast30d)
  })
})

describe('acredAmmFeed', () => {
  it('parses', () => expect(() => AmmFeedSchema.parse(acredAmmFeed)).not.toThrow())
})
