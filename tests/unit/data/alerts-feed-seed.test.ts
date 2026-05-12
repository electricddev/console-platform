import { describe, it, expect } from 'vitest'
import { peerAnomalyEvents } from '@/lib/data/acred/alerts-feed'
import { AnomalyEventSchema } from '@/lib/api/schemas'
import { z } from 'zod'

describe('peerAnomalyEvents seed', () => {
  it('contains exactly 16 events (4 per peer × 4 peers)', () => {
    expect(peerAnomalyEvents.length).toBe(16)
  })

  it('parses every entry against AnomalyEventSchema', () => {
    expect(() => z.array(AnomalyEventSchema).parse(peerAnomalyEvents)).not.toThrow()
  })

  it('covers every non-ACRED portfolio dataset', () => {
    const peerIds = new Set(peerAnomalyEvents.map((e) => e.detailHref?.match(/ds_[a-z_]+/)?.[0]))
    expect(peerIds).toEqual(new Set(['ds_mfone', 'ds_jaaa', 'ds_fasanara', 'ds_ams_credit']))
  })
})
