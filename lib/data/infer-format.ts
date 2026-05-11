import type { Format } from './types'

const INTEGER_TYPES = new Set(['TINYINT', 'SMALLINT', 'INTEGER', 'BIGINT', 'HUGEINT', 'UTINYINT', 'USMALLINT', 'UINTEGER', 'UBIGINT'])
const FLOAT_TYPES = new Set(['FLOAT', 'DOUBLE', 'REAL'])

export function inferFormat(duckdbType: string): Format {
  const t = duckdbType.toUpperCase()
  if (t === 'BOOLEAN') return 'boolean'
  if (INTEGER_TYPES.has(t)) return 'integer'
  if (FLOAT_TYPES.has(t) || t.startsWith('DECIMAL') || t.startsWith('NUMERIC')) return 'decimal'
  if (t === 'DATE') return 'date'
  if (t.startsWith('TIMESTAMP')) return 'datetime'
  return 'text'
}
