'use client'

import { useEffect, useState } from 'react'
import { useDuckDB } from './use-duckdb'
import type { CellResult } from './methodology'

type CellQueryState =
  | { ready: false; result: null; error: null }
  | { ready: false; result: null; error: Error }
  | { ready: true; result: CellResult; error: null }

/**
 * Executes a single DSL string against the shared DuckDB instance.
 * Designed for one-shot execution: the result is cached by stringified `dsl`
 * so re-running the same query (e.g. on viewer re-mount) returns instantly.
 *
 * Uses direct `conn.query(sql)` — not prepared statements — because
 * DuckDB-WASM `prepare()` is unstable across sequential calls on one connection.
 */
export function useCellQuery(dsl: string | null): CellQueryState {
  const { db, ready } = useDuckDB()
  const [state, setState] = useState<CellQueryState>({ ready: false, result: null, error: null })

  useEffect(() => {
    if (!ready || !db || !dsl) return
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      const t0 = performance.now()
      try {
        const res = await conn.query(dsl)
        const columns = res.schema.fields.map((f) => f.name)
        const rows = res.toArray().map((r) => r.toJSON() as Record<string, unknown>)
        const runtimeMs = Math.round(performance.now() - t0)
        if (!cancelled) setState({ ready: true, result: { columns, rows, runtimeMs }, error: null })
      } catch (err: unknown) {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, result: null, error })
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, ready, dsl])

  return state
}
