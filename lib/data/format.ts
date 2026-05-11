import type { ColumnDescriptor } from './types'
import { fmtCurrency, fmtNumber, fmtPct, fmtDate } from '@/lib/format'

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
      return fmtDate(value as string | Date, { pattern: 'yyyy-MM-dd' })
    case 'datetime':
      return fmtDate(value as string | Date, { pattern: 'yyyy-MM-dd HH:mm' })
    case 'identifier':
    case 'enum':
    case 'text':
      return String(value)
    case 'boolean':
      return value ? 'Yes' : 'No'
  }
}
