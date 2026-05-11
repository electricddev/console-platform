'use client'

import { useEffect, useState } from 'react'
import { useDuckDB } from './use-duckdb'
import type * as duckdb from '@duckdb/duckdb-wasm'
import type { Table as ArrowTable } from 'apache-arrow'
import type { ColumnFilter, Format, ResolvedColumn } from './types'

export type ColumnProfile =
  | { kind: 'numeric'; bins: { x0: number; x1: number; count: number }[]; min: number; max: number; nullCount: number; distinct: number }
  | { kind: 'categorical'; top: { value: string; count: number }[]; otherCount: number; nullCount: number; distinct: number }
  | { kind: 'timeline'; buckets: { monthISO: string; count: number }[]; nullCount: number; distinct: number }
  | { kind: 'simple'; nullCount: number; distinct: number; topValue: string | null }

type ProfileState =
  | { ready: false; profile: null; error: null }
  | { ready: false; profile: null; error: Error }
  | { ready: true; profile: ColumnProfile; error: null }

const NUMERIC: ReadonlyArray<Format> = ['currency', 'percent', 'bps', 'integer', 'decimal']

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/** Escape a filter value as an inline SQL literal. Read-only profiling only — not for mutations. */
function literalSQL(v: unknown): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
  if (typeof v === 'number') return isFinite(v) ? String(v) : 'NULL'
  return `'${String(v).replace(/'/g, "''")}'`
}

function buildWhereInline(filters: ColumnFilter[]): string {
  const parts: string[] = []
  for (const f of filters) {
    const id = quoteIdent(f.column)
    if (f.kind === 'numeric') {
      if (f.min !== undefined) parts.push(`${id} >= ${literalSQL(f.min)}`)
      if (f.max !== undefined) parts.push(`${id} <= ${literalSQL(f.max)}`)
    } else if (f.kind === 'enum') {
      if (f.values.length === 0) continue
      parts.push(`${id} IN (${f.values.map(literalSQL).join(', ')})`)
    } else if (f.kind === 'date') {
      if (f.fromISO) parts.push(`${id} >= ${literalSQL(f.fromISO)}`)
      if (f.toISO) parts.push(`${id} <= ${literalSQL(f.toISO)}`)
    } else if (f.kind === 'text') {
      if (!f.contains) continue
      parts.push(`LOWER(${id}) LIKE ${literalSQL('%' + f.contains.toLowerCase() + '%')}`)
    } else if (f.kind === 'boolean') {
      if (f.value === null) continue
      parts.push(`${id} = ${literalSQL(f.value)}`)
    }
  }
  return parts.length === 0 ? '' : `WHERE ${parts.join(' AND ')}`
}

/** Run a single query on its own fresh connection to avoid WASM state issues between sequential queries. */
async function runQuery(db: duckdb.AsyncDuckDB, sql: string): Promise<ArrowTable> {
  const conn = await db.connect()
  try {
    return await conn.query(sql) as ArrowTable
  } finally {
    await conn.close()
  }
}

export function useColumnProfile(
  tableId: string | null,
  column: ResolvedColumn | null,
  filters: ColumnFilter[],
): ProfileState {
  const { db, ready } = useDuckDB()
  const [state, setState] = useState<ProfileState>({ ready: false, profile: null, error: null })

  useEffect(() => {
    if (!ready || !db || !tableId || !column) return
    let cancelled = false
    ;(async () => {
      try {
        const where = buildWhereInline(filters)
        const tbl = quoteIdent(tableId)
        const id = quoteIdent(column.id)
        const from = `FROM ${tbl} ${where}`

        // Arrow StructRow has a toJSON() method but TypeScript doesn't know this type.
        type StructRow = { toJSON(): unknown }
        function rows<T>(result: ArrowTable): T[] {
          return (result.toArray() as unknown as StructRow[]).map((r) => r.toJSON() as T)
        }

        // Summary — 'distinct' is a reserved word in DuckDB; use dist_count.
        type SummaryRow = { total: bigint; non_null: bigint; dist_count: bigint }
        const summaryResult = await runQuery(db,
          `SELECT COUNT(*)::BIGINT AS total, COUNT(${id})::BIGINT AS non_null, COUNT(DISTINCT ${id})::BIGINT AS dist_count ${from}`
        )
        const summary = rows<SummaryRow>(summaryResult)[0]
        const total = Number(summary.total)
        const distinct = Number(summary.dist_count)
        const nullCount = total - Number(summary.non_null)

        if (NUMERIC.includes(column.format)) {
          type StatsRow = { mn: number | null; mx: number | null }
          const statsResult = await runQuery(db,
            `SELECT MIN(${id})::DOUBLE AS mn, MAX(${id})::DOUBLE AS mx ${from}`
          )
          const stats = rows<StatsRow>(statsResult)[0]

          if (stats.mn == null || stats.mx == null || stats.mn === stats.mx) {
            if (!cancelled) setState({
              ready: true,
              profile: { kind: 'numeric', bins: [], min: stats.mn ?? 0, max: stats.mx ?? 0, nullCount, distinct },
              error: null,
            })
            return
          }

          const N = 20
          const notNullWhere = where ? `${where} AND ${id} IS NOT NULL` : `WHERE ${id} IS NOT NULL`
          // Avoid WIDTH_BUCKET — it throws a C++ exception in DuckDB-WASM 1.33.x for
          // values at the upper bound. Use manual bucket formula instead:
          //   bucket = FLOOR((val - mn) / range * N), clamped to [0, N-1].
          const range = stats.mx - stats.mn
          type HistRow = { bucket: number; c: bigint }
          const histResult = await runQuery(db,
            `SELECT LEAST(FLOOR((${id} - ${stats.mn}) / ${range} * ${N})::INTEGER, ${N - 1}) AS bucket, ` +
            `COUNT(*)::BIGINT AS c ` +
            `FROM ${tbl} ${notNullWhere} GROUP BY bucket ORDER BY bucket`
          )
          const histRows = rows<HistRow>(histResult)
          const width = range / N
          const bins: { x0: number; x1: number; count: number }[] = []
          for (let b = 0; b < N; b++) {
            const row = histRows.find((r) => Number(r.bucket) === b)
            bins.push({
              x0: stats.mn + b * width,
              x1: stats.mn + (b + 1) * width,
              count: row ? Number(row.c) : 0,
            })
          }
          if (!cancelled) setState({
            ready: true,
            profile: { kind: 'numeric', bins, min: stats.mn, max: stats.mx, nullCount, distinct },
            error: null,
          })

        } else if (column.format === 'enum' || (column.format === 'text' && distinct > 0 && distinct <= 50)) {
          const notNullWhere = where ? `${where} AND ${id} IS NOT NULL` : `WHERE ${id} IS NOT NULL`
          type TopRow = { v: string; c: bigint }
          const topResult = await runQuery(db,
            `SELECT ${id} AS v, COUNT(*)::BIGINT AS c FROM ${tbl} ${notNullWhere} GROUP BY v ORDER BY c DESC LIMIT 10`
          )
          const topRows = rows<TopRow>(topResult)
          const top = topRows.map((r) => ({ value: String(r.v), count: Number(r.c) }))
          const otherCount = total - top.reduce((s, x) => s + x.count, 0) - nullCount
          if (!cancelled) setState({
            ready: true,
            profile: { kind: 'categorical', top, otherCount, nullCount, distinct },
            error: null,
          })

        } else if (column.format === 'date' || column.format === 'datetime') {
          // strftime returns VARCHAR — no Arrow bitmap issue.
          type TLRow = { monthISO: string; c: bigint }
          const tlResult = await runQuery(db,
            `SELECT strftime(date_trunc('month', ${id}), '%Y-%m-01') AS monthISO, COUNT(*)::BIGINT AS c ${from} GROUP BY monthISO ORDER BY monthISO`
          )
          const tlRows = rows<TLRow>(tlResult)
          if (!cancelled) setState({
            ready: true,
            profile: { kind: 'timeline', buckets: tlRows.map((r) => ({ monthISO: r.monthISO, count: Number(r.c) })), nullCount, distinct },
            error: null,
          })

        } else {
          // Identifier / high-cardinality text / boolean → simple.
          let topValue: string | null = null
          if (distinct > 0) {
            type TopValRow = { v: unknown }
            const topResult = await runQuery(db,
              `SELECT ${id} AS v ${from} GROUP BY v ORDER BY COUNT(*) DESC LIMIT 1`
            )
            const t = rows<TopValRow>(topResult)[0]
            topValue = t && t.v != null ? String(t.v) : null
          }
          if (!cancelled) setState({
            ready: true,
            profile: { kind: 'simple', nullCount, distinct, topValue },
            error: null,
          })
        }
      } catch (err: unknown) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, profile: null, error })
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ready, tableId, column, JSON.stringify(filters)])

  return state
}
