'use client'

import { useEffect, useState } from 'react'
import type { ResolvedColumn, TableDescriptor } from './types'
import { useDuckDB } from './use-duckdb'
import { inferFormat } from './infer-format'

type SchemaState =
  | { ready: false; columns: null; error: null }
  | { ready: false; columns: null; error: Error }
  | { ready: true; columns: ResolvedColumn[]; error: null }

export function useTableSchema(table: TableDescriptor | null): SchemaState {
  const { db, ready: dbReady } = useDuckDB()
  const [state, setState] = useState<SchemaState>({ ready: false, columns: null, error: null })

  useEffect(() => {
    if (!dbReady || !db || !table) return
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      try {
        const result = await conn.query(`DESCRIBE "${table.id}"`)
        type DescribeRow = { column_name: string; column_type: string }
        const rows = result.toArray().map((r) => r.toJSON() as unknown as DescribeRow)
        const descByCol = new Map(table.columns.map((c) => [c.id, c]))
        const resolved: ResolvedColumn[] = rows.map((r) => {
          const d = descByCol.get(r.column_name)
          if (d) {
            return { ...d, duckdbType: r.column_type, curated: true }
          }
          return {
            id: r.column_name,
            label: r.column_name,
            format: inferFormat(r.column_type),
            duckdbType: r.column_type,
            curated: false,
          }
        })
        if (!cancelled) setState({ ready: true, columns: resolved, error: null })

        // Drift warning: descriptor columns missing from DuckDB.
        const duckCols = new Set(rows.map((r) => r.column_name))
        for (const d of table.columns) {
          if (!duckCols.has(d.id)) {
            console.warn(`[descriptor-drift] table "${table.id}" describes "${d.id}" but parquet has no such column`)
          }
        }
      } catch (err: unknown) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, columns: null, error })
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, dbReady, table])

  return state
}
