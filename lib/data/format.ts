import type { ColumnDescriptor } from './types'
import { fmtCurrency, fmtNumber, fmtPct, fmtDate } from '@/lib/format'

/**
 * DuckDB WASM returns DATE columns as a number (days since Unix epoch),
 * TIMESTAMP columns as a bigint (microseconds since Unix epoch).
 * Convert those to JS Date before passing to fmtDate.
 */
function toDateArg(value: unknown): string | Date {
  if (value instanceof Date) return value
  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    // Arrow DateDay.get returns epochDaysToMs = days * 86_400_000 (already milliseconds)
    return new Date(value)
  }
  if (typeof value === 'bigint') {
    // epoch_ms() returns BIGINT milliseconds since epoch.
    // Raw DuckDB WASM timestamps come as bigint microseconds (divide by 1000 for ms).
    // Heuristic: values > year 5000 in ms are microseconds.
    const n = Number(value)
    return new Date(n > 99_999_999_999_999 ? n / 1000 : n)
  }
  // Fallback: stringify and let fmtDate handle it
  return String(value)
}

export function formatValue(value: unknown, col: ColumnDescriptor): string {
  if (value === null || value === undefined) return '—'

  switch (col.format) {
    case 'currency': {
      const n = Number(value)
      return fmtCurrency(n, { currency: col.unit ?? 'USD', decimals: col.precision ?? 0 })
    }
    case 'percent': {
      const n = Number(value)
      return fmtPct(n, { decimals: col.precision ?? 1 })
    }
    case 'bps': {
      const n = Number(value)
      return `${fmtNumber(n, { decimals: col.precision ?? 0 })} bps`
    }
    case 'integer':
      return fmtNumber(Number(value), { decimals: 0 })
    case 'decimal':
      return fmtNumber(Number(value), { decimals: col.precision ?? 2 })
    case 'date':
      return fmtDate(toDateArg(value), { pattern: 'yyyy-MM-dd' })
    case 'datetime':
      return fmtDate(toDateArg(value), { pattern: 'yyyy-MM-dd HH:mm' })
    case 'identifier':
    case 'enum':
    case 'text':
      return String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
  }
}
