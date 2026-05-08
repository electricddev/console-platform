import { describe, it, expect } from 'vitest'
import {
  fmtNumber,
  fmtPct,
  fmtCurrency,
  fmtDate,
  fmtRelativeTime,
  fmtHash,
  fmtDuration,
} from '@/lib/format'

describe('format', () => {
  it('fmtNumber adds thousands separators', () => {
    expect(fmtNumber(1234567)).toBe('1,234,567')
  })
  it('fmtNumber respects decimals', () => {
    expect(fmtNumber(12.345, { decimals: 1 })).toBe('12.3')
  })
  it('fmtPct renders one decimal by default', () => {
    expect(fmtPct(0.234)).toBe('23.4%')
  })
  it('fmtCurrency uses USD by default', () => {
    expect(fmtCurrency(1234.5)).toMatch(/\$1,234\.50|US\$1,234\.50/)
  })
  it('fmtDate renders an absolute timestamp', () => {
    expect(fmtDate('2026-05-08T12:00:00Z')).toMatch(/2026/)
  })
  it('fmtRelativeTime renders "Xm ago" for recent timestamps', () => {
    const now = new Date()
    const fiveMinAgo = new Date(now.getTime() - 5 * 60_000).toISOString()
    expect(fmtRelativeTime(fiveMinAgo)).toMatch(/min/i)
  })
  it('fmtHash truncates with ellipsis', () => {
    expect(fmtHash('0xabcdef0123456789abcdef0123456789abcdef01')).toBe('0xabcdef…ef01')
  })
  it('fmtDuration handles ms / s / minutes', () => {
    expect(fmtDuration(120)).toBe('120 ms')
    expect(fmtDuration(2_400)).toBe('2.4 s')
    expect(fmtDuration(180_000)).toBe('3 min')
  })
})
