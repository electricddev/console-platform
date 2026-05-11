'use client'

import type * as duckdb from '@duckdb/duckdb-wasm'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fmtNumber } from '@/lib/format'
import type { ColumnFilter, ResolvedColumn, SortState } from '@/lib/data/types'
import { buildWhereClause } from '@/lib/data/filters'

type Props = {
  db: duckdb.AsyncDuckDB
  tableId: string
  columns: ResolvedColumn[]
  filters: ColumnFilter[]
  sort: SortState
  totalCount: number | null
  onRemoveFilter: (column: string) => void
  onClearFilters: () => void
}

export function ExploreToolbar({
  db,
  tableId,
  columns,
  filters,
  sort,
  totalCount,
  onRemoveFilter,
  onClearFilters,
}: Props) {
  async function exportCSV() {
    const { sql: where, params } = buildWhereClause(filters)
    const orderBy = sort
      ? `ORDER BY "${sort.column.replace(/"/g, '""')}" ${sort.dir.toUpperCase()}`
      : ''
    const sql = `SELECT * FROM "${tableId}" ${where} ${orderBy}`
    const conn = await db.connect()
    try {
      const stmt = await conn.prepare(sql)
      const result = await stmt.query(...params)
      const colNames = result.schema.fields.map((f) => f.name)
      const rows = result.toArray().map((r) => r.toJSON() as Record<string, unknown>)
      const csv = [
        colNames.map(csvCell).join(','),
        ...rows.map((row) => colNames.map((c) => csvCell(row[c])).join(',')),
      ].join('\n')
      await stmt.close()

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tableId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      await conn.close()
    }
  }

  function labelFor(columnId: string): string {
    return columns.find((c) => c.id === columnId)?.label ?? columnId
  }

  function chipText(f: ColumnFilter): string {
    const name = labelFor(f.column)
    if (f.kind === 'numeric') {
      const parts: string[] = []
      if (f.min !== undefined) parts.push(`≥ ${f.min}`)
      if (f.max !== undefined) parts.push(`≤ ${f.max}`)
      return parts.length ? `${name}: ${parts.join(' · ')}` : name
    }
    if (f.kind === 'enum') return f.values.length ? `${name}: ${f.values.join(', ')}` : name
    if (f.kind === 'date') {
      const parts: string[] = []
      if (f.fromISO) parts.push(`≥ ${f.fromISO}`)
      if (f.toISO) parts.push(`≤ ${f.toISO}`)
      return parts.length ? `${name}: ${parts.join(' · ')}` : name
    }
    if (f.kind === 'text') return f.contains ? `${name} ~ "${f.contains}"` : name
    return `${name}: ${f.value === true ? 'Yes' : f.value === false ? 'No' : 'Any'}`
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-1 py-1 text-sm">
      <span className="font-mono text-xs text-muted-foreground">
        {totalCount == null ? '—' : `${fmtNumber(totalCount)} rows`}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {filters.map((f) => (
          <Badge key={f.column} variant="outline" className="gap-1 font-normal">
            <span>{chipText(f)}</span>
            <button
              type="button"
              aria-label={`Remove filter ${labelFor(f.column)}`}
              onClick={() => onRemoveFilter(f.column)}
              className="hover:text-foreground"
            >
              ×
            </button>
          </Badge>
        ))}
        {filters.length > 1 && (
          <Button size="sm" variant="ghost" onClick={onClearFilters}>
            Clear all
          </Button>
        )}
      </div>
      <Button size="sm" variant="outline" className="ml-auto" onClick={exportCSV}>
        Export CSV
      </Button>
    </div>
  )
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const s =
    typeof v === 'string'
      ? v
      : typeof v === 'bigint'
        ? v.toString()
        : JSON.stringify(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}
