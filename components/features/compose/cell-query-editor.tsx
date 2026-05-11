'use client'

import { useEffect, useRef, useState, type Dispatch } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { useDuckDB } from '@/lib/data/use-duckdb'
import type { NotebookCell } from '@/lib/api/types'
import type { ComposerAction, ComposerState } from './composer-reducer'
import { ResultRenderer } from './result-renderer'

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false })

type Props = {
  cell: NotebookCell & { kind: 'query' }
  state: ComposerState
  dispatch: Dispatch<ComposerAction>
}

export function CellQueryEditor({ cell, state, dispatch }: Props) {
  const { db, ready } = useDuckDB()
  const [expandSql, setExpandSql] = useState<boolean>(!cell.methodologyId)
  const result = state.results[cell.id]
  const error = state.errors[cell.id]
  const running = state.running.has(cell.id)
  const shape = cell.renderShape ?? 'table'

  // Auto-run on first mount if there is a DSL and no result yet.
  const autoRanRef = useRef(false)
  useEffect(() => {
    if (autoRanRef.current) return
    if (!ready || !db || !cell.dsl || result || running) return
    autoRanRef.current = true
    runOnce()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, db, cell.dsl])

  async function runOnce() {
    if (!db || !cell.dsl) return
    dispatch({ type: 'start-run', id: cell.id })
    const conn = await db.connect()
    const t0 = performance.now()
    try {
      const res = await conn.query(cell.dsl)
      const columns = res.schema.fields.map((f) => f.name)
      const rows = res.toArray().map((r) => r.toJSON() as Record<string, unknown>)
      const runtimeMs = Math.round(performance.now() - t0)
      dispatch({ type: 'finish-run', id: cell.id, result: { columns, rows, runtimeMs } })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      dispatch({ type: 'fail-run', id: cell.id, error: message })
    } finally {
      await conn.close()
    }
  }

  return (
    <div className="grid gap-2">
      {expandSql ? (
        <div className="rounded-md border border-border/60 bg-background">
          <MonacoEditor
            height={Math.max(120, Math.min(320, (cell.dsl.split('\n').length + 2) * 18))}
            defaultLanguage="sql"
            value={cell.dsl}
            onChange={(v) => dispatch({ type: 'set-dsl', id: cell.id, dsl: v ?? '' })}
            options={{ minimap: { enabled: false }, fontSize: 12, scrollBeyondLastLine: false }}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setExpandSql(true)}
          className="rounded-md border border-border/60 bg-background px-2 py-1 text-left font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {cell.dsl.split('\n')[0].slice(0, 80)}{cell.dsl.length > 80 ? '…' : ''} <span className="text-foreground/40">(click to edit SQL)</span>
        </button>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={runOnce} disabled={!ready || running || !cell.dsl}>
          {running ? 'Running…' : 'Run'}
        </Button>
        {result && (
          <span className="font-mono text-xs text-muted-foreground">{result.runtimeMs} ms · {result.rows.length} rows</span>
        )}
        {error && <span className="text-xs text-destructive">Error: {error}</span>}
      </div>

      {result && !error && <ResultRenderer result={result} shape={shape} />}
    </div>
  )
}
