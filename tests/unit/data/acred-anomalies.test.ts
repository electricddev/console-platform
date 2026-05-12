import { describe, it, expect } from 'vitest'
import { AnomalyEventSchema } from '@/lib/api/schemas'
import { acredAnomalyFeed } from '@/lib/data/acred/anomalies'

describe('acredAnomalyFeed', () => {
  it('parses every entry against AnomalyEventSchema', () => {
    expect(acredAnomalyFeed.length).toBeGreaterThanOrEqual(3)
    acredAnomalyFeed.forEach((e) => {
      expect(() => AnomalyEventSchema.parse(e)).not.toThrow()
    })
  })

  it('is sorted newest-first', () => {
    const ts = acredAnomalyFeed.map((e) => new Date(e.occurredAt).getTime())
    expect([...ts].sort((a, b) => b - a)).toEqual(ts)
  })

  it('credit-event entries carry a borrowerNormalized', () => {
    acredAnomalyFeed
      .filter((e) => e.kind === 'credit-event')
      .forEach((e) => expect(e.borrowerNormalized).toBeTruthy())
  })
})
