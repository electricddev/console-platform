import { describe, expect, it } from 'vitest'
import { CATALOG, type ConnectorDefinition } from '@/components/v2/features/sources/catalog-data'
import { ConnectorCategorySchema } from '@/lib/api/schemas'

describe('ConnectorCategorySchema', () => {
  it('accepts the new Payments category', () => {
    expect(ConnectorCategorySchema.parse('payments')).toBe('payments')
  })

  it('accepts the new Banking category', () => {
    expect(ConnectorCategorySchema.parse('banking')).toBe('banking')
  })

  it('accepts the new Accounting category', () => {
    expect(ConnectorCategorySchema.parse('accounting')).toBe('accounting')
  })

  it('still accepts existing categories', () => {
    expect(ConnectorCategorySchema.parse('fund-admin')).toBe('fund-admin')
    expect(ConnectorCategorySchema.parse('regulator')).toBe('regulator')
  })
})

describe('CATALOG trust copy', () => {
  const wired: ConnectorDefinition[] = CATALOG.filter((c) => c.wired === 'wired')

  it('has at least one wired connector', () => {
    expect(wired.length).toBeGreaterThan(0)
  })

  it.each(wired)('$id has all four Trust fields populated', (c) => {
    expect(c.trust).toBeDefined()
    expect(c.trust?.reads.length).toBeGreaterThan(0)
    expect(c.trust?.storage.length).toBeGreaterThan(0)
    expect(c.trust?.audit.length).toBeGreaterThan(0)
    expect(c.trust?.revoke.length).toBeGreaterThan(0)
  })
})
