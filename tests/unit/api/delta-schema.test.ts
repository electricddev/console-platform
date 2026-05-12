import { describe, it, expect } from 'vitest'
import { DeltaSchema, DeltaToneSchema } from '@/lib/api/schemas'

describe('DeltaSchema', () => {
  it('parses a well-formed delta', () => {
    const parsed = DeltaSchema.parse({ value: 1.612e9, delta: -0.011, deltaKind: 'pct', tone: 'negative' })
    expect(parsed.deltaKind).toBe('pct')
  })

  it('rejects an unknown tone', () => {
    expect(() => DeltaSchema.parse({ value: 1, delta: 0, deltaKind: 'pp', tone: 'rad' })).toThrow()
  })

  it('exposes the closed tone enum', () => {
    expect(DeltaToneSchema.options).toEqual(['positive', 'negative', 'neutral'])
  })
})
