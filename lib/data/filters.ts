import type { ColumnFilter, FilterState } from './types'

export type WhereBuilt = { sql: string; params: unknown[] }

function quoteIdent(col: string): string {
  // DuckDB identifier; escape any embedded quotes.
  return `"${col.replace(/"/g, '""')}"`
}

export function buildWhereClause(filters: ColumnFilter[]): WhereBuilt {
  const parts: string[] = []
  const params: unknown[] = []

  for (const f of filters) {
    const id = quoteIdent(f.column)
    if (f.kind === 'numeric') {
      if (f.min !== undefined) { parts.push(`${id} >= ?`); params.push(f.min) }
      if (f.max !== undefined) { parts.push(`${id} <= ?`); params.push(f.max) }
    } else if (f.kind === 'enum') {
      if (f.values.length === 0) continue
      const placeholders = f.values.map(() => '?').join(', ')
      parts.push(`${id} IN (${placeholders})`)
      params.push(...f.values)
    } else if (f.kind === 'date') {
      if (f.fromISO) { parts.push(`${id} >= ?`); params.push(f.fromISO) }
      if (f.toISO) { parts.push(`${id} <= ?`); params.push(f.toISO) }
    } else if (f.kind === 'text') {
      if (!f.contains) continue
      parts.push(`LOWER(${id}) LIKE ?`)
      params.push(`%${f.contains.toLowerCase()}%`)
    } else if (f.kind === 'boolean') {
      if (f.value === null) continue
      parts.push(`${id} = ?`)
      params.push(f.value)
    }
  }

  if (parts.length === 0) return { sql: '', params: [] }
  return { sql: `WHERE ${parts.join(' AND ')}`, params }
}

export function encodeFilterState(state: FilterState): string {
  const json = JSON.stringify(state)
  // base64url
  return btoa(json).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeFilterState(encoded: string): FilterState | null {
  try {
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(padded)
    const parsed = JSON.parse(json) as FilterState
    if (typeof parsed !== 'object' || parsed === null) return null
    if (typeof parsed.table !== 'string' || !Array.isArray(parsed.filters)) return null
    return parsed
  } catch {
    return null
  }
}
