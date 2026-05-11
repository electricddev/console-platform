'use client'

import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_mvp_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import duckdb_mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'

let dbPromise: Promise<duckdb.AsyncDuckDB> | null = null

const PARQUET_FILES = [
  'borrowers',
  'holdings',
  'concentration_metrics',
  'credit_events',
  'fund_overview',
] as const

async function init(): Promise<duckdb.AsyncDuckDB> {
  const bundle: duckdb.DuckDBBundle = {
    mainModule: duckdb_mvp_wasm,
    mainWorker: duckdb_mvp_worker,
    pthreadWorker: null,
  }
  const worker = new Worker(bundle.mainWorker!)
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING)
  const db = new duckdb.AsyncDuckDB(logger, worker)
  await db.instantiate(bundle.mainModule)

  // Register each parquet by name and create a view of the same name.
  const conn = await db.connect()
  try {
    for (const name of PARQUET_FILES) {
      const url = `/structured/${name}.parquet`
      await db.registerFileURL(`${name}.parquet`, url, duckdb.DuckDBDataProtocol.HTTP, false)
      await conn.query(`CREATE OR REPLACE VIEW ${name} AS SELECT * FROM read_parquet('${name}.parquet')`)
    }
  } finally {
    await conn.close()
  }
  return db
}

export function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (!dbPromise) dbPromise = init()
  return dbPromise
}

/** Test seam: reset the singleton (only used in tests). */
export function __resetDBForTests(): void {
  dbPromise = null
}
