import { describe, it, expect } from 'vitest'
import { acredTables } from '@/lib/data/acred/tables'

const FORMATS = new Set([
  'currency', 'percent', 'bps', 'integer', 'decimal',
  'date', 'datetime', 'identifier', 'enum', 'text', 'boolean',
])

describe('acredTables descriptors', () => {
  it('has all 5 expected tables', () => {
    const ids = acredTables.map((t) => t.id).sort()
    expect(ids).toEqual([
      'borrowers',
      'concentration_metrics',
      'credit_events',
      'fund_overview',
      'holdings',
    ])
  })

  it('every table has a non-empty primaryKey and at least one column', () => {
    for (const t of acredTables) {
      expect(t.primaryKey, `table ${t.id} missing primaryKey`).toBeTruthy()
      expect(t.columns.length, `table ${t.id} has no columns`).toBeGreaterThan(0)
    }
  })

  it('every column has id, label, and a valid format', () => {
    for (const t of acredTables) {
      for (const c of t.columns) {
        expect(c.id, `table ${t.id} column without id`).toBeTruthy()
        expect(c.label, `table ${t.id}.${c.id} missing label`).toBeTruthy()
        expect(FORMATS.has(c.format), `table ${t.id}.${c.id} invalid format`).toBe(true)
      }
    }
  })

  it('primaryKey references a real column', () => {
    for (const t of acredTables) {
      const ids = new Set(t.columns.map((c) => c.id))
      expect(ids.has(t.primaryKey), `table ${t.id} primaryKey ${t.primaryKey} missing from columns`).toBe(true)
    }
  })

  it('column ids are unique within a table', () => {
    for (const t of acredTables) {
      const seen = new Set<string>()
      for (const c of t.columns) {
        expect(seen.has(c.id), `table ${t.id} duplicate column ${c.id}`).toBe(false)
        seen.add(c.id)
      }
    }
  })
})
