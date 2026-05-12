import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  getAcredBriefRedFlags, getAcredAnomalyFeed, getAcredPeerDispersion,
  getAcredAttestationDiscipline, getAcredAmmFeed,
} from '@/lib/api/endpoints/datasets'
import {
  RedFlagSchema, AnomalyEventSchema, PeerDispersionRowSchema,
  AttestationDisciplineSchema, AmmFeedSchema,
} from '@/lib/api/schemas'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }

describe('ACRED brief endpoints', () => {
  it('getAcredBriefRedFlags returns RedFlag[]', async () => {
    const data = await getAcredBriefRedFlags(ctx)
    expect(() => z.array(RedFlagSchema).parse(data)).not.toThrow()
  })

  it('getAcredAnomalyFeed returns AnomalyEvent[]', async () => {
    const data = await getAcredAnomalyFeed(ctx)
    expect(() => z.array(AnomalyEventSchema).parse(data)).not.toThrow()
  })

  it('getAcredPeerDispersion returns PeerDispersionRow[]', async () => {
    const data = await getAcredPeerDispersion(ctx)
    expect(() => z.array(PeerDispersionRowSchema).parse(data)).not.toThrow()
  })

  it('getAcredAttestationDiscipline returns AttestationDiscipline', async () => {
    const data = await getAcredAttestationDiscipline(ctx)
    expect(() => AttestationDisciplineSchema.parse(data)).not.toThrow()
  })

  it('getAcredAmmFeed returns AmmFeed', async () => {
    const data = await getAcredAmmFeed(ctx)
    expect(() => AmmFeedSchema.parse(data)).not.toThrow()
  })
})
