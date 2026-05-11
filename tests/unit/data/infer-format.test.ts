import { describe, it, expect } from 'vitest'
import { inferFormat } from '@/lib/data/infer-format'

describe('inferFormat', () => {
  it('maps integer types to integer', () => {
    expect(inferFormat('INTEGER')).toBe('integer')
    expect(inferFormat('BIGINT')).toBe('integer')
    expect(inferFormat('TINYINT')).toBe('integer')
    expect(inferFormat('SMALLINT')).toBe('integer')
    expect(inferFormat('HUGEINT')).toBe('integer')
  })

  it('maps floating types to decimal', () => {
    expect(inferFormat('DOUBLE')).toBe('decimal')
    expect(inferFormat('FLOAT')).toBe('decimal')
    expect(inferFormat('DECIMAL(10,2)')).toBe('decimal')
  })

  it('maps DATE to date and TIMESTAMP to datetime', () => {
    expect(inferFormat('DATE')).toBe('date')
    expect(inferFormat('TIMESTAMP')).toBe('datetime')
    expect(inferFormat('TIMESTAMP WITH TIME ZONE')).toBe('datetime')
  })

  it('maps BOOLEAN to boolean', () => {
    expect(inferFormat('BOOLEAN')).toBe('boolean')
  })

  it('maps VARCHAR and unknown to text', () => {
    expect(inferFormat('VARCHAR')).toBe('text')
    expect(inferFormat('BLOB')).toBe('text')
  })

  it('is case-insensitive', () => {
    expect(inferFormat('integer')).toBe('integer')
    expect(inferFormat('Date')).toBe('date')
  })
})
