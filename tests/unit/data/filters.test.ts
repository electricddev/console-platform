import { describe, it, expect } from 'vitest'
import { buildWhereClause, encodeFilterState, decodeFilterState } from '@/lib/data/filters'
import type { FilterState } from '@/lib/data/types'

describe('buildWhereClause', () => {
  it('returns empty string when no filters', () => {
    const { sql, params } = buildWhereClause([])
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('builds numeric range with min and max', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'numeric', column: 'arr_balance', min: 100, max: 1000 },
    ])
    expect(sql).toBe('WHERE "arr_balance" >= ? AND "arr_balance" <= ?')
    expect(params).toEqual([100, 1000])
  })

  it('builds numeric range with only min', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'numeric', column: 'arr_balance', min: 100 },
    ])
    expect(sql).toBe('WHERE "arr_balance" >= ?')
    expect(params).toEqual([100])
  })

  it('builds enum filter as IN clause', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'enum', column: 'rating', values: ['AAA', 'AA'] },
    ])
    expect(sql).toBe('WHERE "rating" IN (?, ?)')
    expect(params).toEqual(['AAA', 'AA'])
  })

  it('skips empty enum filter', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'enum', column: 'rating', values: [] },
    ])
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('builds date range', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'date', column: 'funded_at', fromISO: '2025-01-01', toISO: '2025-06-30' },
    ])
    expect(sql).toBe('WHERE "funded_at" >= ? AND "funded_at" <= ?')
    expect(params).toEqual(['2025-01-01', '2025-06-30'])
  })

  it('builds text contains case-insensitive', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'text', column: 'industry', contains: 'tech' },
    ])
    expect(sql).toBe('WHERE LOWER("industry") LIKE ?')
    expect(params).toEqual(['%tech%'])
  })

  it('builds boolean filter', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'boolean', column: 'watchlist', value: true },
    ])
    expect(sql).toBe('WHERE "watchlist" = ?')
    expect(params).toEqual([true])
  })

  it('skips boolean filter when value is null', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'boolean', column: 'watchlist', value: null },
    ])
    expect(sql).toBe('')
    expect(params).toEqual([])
  })

  it('joins multiple filters with AND', () => {
    const { sql, params } = buildWhereClause([
      { kind: 'numeric', column: 'arr', min: 1 },
      { kind: 'enum', column: 'rating', values: ['AAA'] },
    ])
    expect(sql).toBe('WHERE "arr" >= ? AND "rating" IN (?)')
    expect(params).toEqual([1, 'AAA'])
  })
})

describe('FilterState url roundtrip', () => {
  const state: FilterState = {
    table: 'holdings',
    sort: { column: 'arr_balance', dir: 'desc' },
    filters: [
      { kind: 'numeric', column: 'arr_balance', min: 100, max: 1000 },
      { kind: 'enum', column: 'rating', values: ['AAA', 'AA'] },
    ],
  }

  it('encode then decode roundtrips', () => {
    const encoded = encodeFilterState(state)
    expect(typeof encoded).toBe('string')
    const decoded = decodeFilterState(encoded)
    expect(decoded).toEqual(state)
  })

  it('decode returns null on invalid input', () => {
    expect(decodeFilterState('not-base64-or-json')).toBeNull()
  })
})
