'use client'

import { useEffect, useState } from 'react'
import { useDuckDB } from './use-duckdb'
import { buildWhereClause } from './filters'
import type { ColumnFilter, SortState } from './types'

export type QueryInput = {
  table: string
  filters: ColumnFilter[]
  sort: SortState
  limit: number
  offset: number
}

type QueryState =
  | { ready: false; rows: null; totalCount: null; error: null }
  | { ready: false; rows: null; totalCount: null; error: Error }
  | { ready: true; rows: Record<string, unknown>[]; totalCount: number; error: null }

export function useTableQuery(input: QueryInput): QueryState {
  const { db, ready } = useDuckDB()
  const [state, setState] = useState<QueryState>({ ready: false, rows: null, totalCount: null, error: null })

  useEffect(() => {
    if (!ready || !db) return
    let cancelled = false

    const handle = setTimeout(() => {
      ;(async () => {
        const conn = await db.connect()
        try {
          const { sql: where, params } = buildWhereClause(input.filters)
          const orderBy = input.sort
            ? `ORDER BY "${input.sort.column.replace(/"/g, '""')}" ${input.sort.dir.toUpperCase()}`
            : ''
          const dataSQL = `SELECT * FROM "${input.table}" ${where} ${orderBy} LIMIT ${input.limit} OFFSET ${input.offset}`
          const countSQL = `SELECT COUNT(*)::BIGINT AS c FROM "${input.table}" ${where}`

          const dataStmt = await conn.prepare(dataSQL)
          const countStmt = await conn.prepare(countSQL)
          try {
            // params is unknown[] from buildWhereClause; cast to any[] for the
            // rest-spread into AsyncPreparedStatement.query(...params: any[]).
            const anyParams = params as unknown[]
            const dataResult = await dataStmt.query(...anyParams)
            const countResult = await countStmt.query(...anyParams)
            const rows = dataResult.toArray().map((r) => r.toJSON() as Record<string, unknown>)
            const total = Number((countResult.toArray()[0] as unknown as { c: bigint | number }).c)
            if (!cancelled) setState({ ready: true, rows, totalCount: total, error: null })
          } finally {
            await dataStmt.close()
            await countStmt.close()
          }
        } catch (err: unknown) {
          if (cancelled) return
          const error = err instanceof Error ? err : new Error(String(err))
          setState({ ready: false, rows: null, totalCount: null, error })
        } finally {
          await conn.close()
        }
      })()
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(handle)
    }
    // Stringify filters/sort for stable identity. Cheap given size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, ready, input.table, input.limit, input.offset, JSON.stringify(input.filters), JSON.stringify(input.sort)])

  return state
}
