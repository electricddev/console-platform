'use client'

import { useEffect, useState } from 'react'
import type * as duckdb from '@duckdb/duckdb-wasm'
import { getDB } from './duckdb'

export type DuckDBState =
  | { ready: false; db: null; error: null }
  | { ready: false; db: null; error: Error }
  | { ready: true; db: duckdb.AsyncDuckDB; error: null }

export function useDuckDB(): DuckDBState {
  const [state, setState] = useState<DuckDBState>({ ready: false, db: null, error: null })

  useEffect(() => {
    let cancelled = false
    getDB()
      .then((db) => { if (!cancelled) setState({ ready: true, db, error: null }) })
      .catch((err: unknown) => {
        if (cancelled) return
        const error = err instanceof Error ? err : new Error(String(err))
        setState({ ready: false, db: null, error })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
