import { describe, expect, it } from 'vitest'
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
