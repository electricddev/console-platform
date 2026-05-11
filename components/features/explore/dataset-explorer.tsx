'use client'

import { useState } from 'react'
import type { TableDescriptor } from '@/lib/data/types'
import { useDuckDB } from '@/lib/data/use-duckdb'
import { LoadingState } from './loading-state'

type Props = { datasetId: string; tables: TableDescriptor[] }

export function DatasetExplorer({ datasetId: _datasetId, tables }: Props) {
  const { ready, error } = useDuckDB()
  const [activeTableId, setActiveTableId] = useState<string>(tables[0]?.id ?? '')

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        Failed to start the query engine: {error.message}
      </div>
    )
  }

  if (!ready) {
    return <LoadingState />
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <aside className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
        <div className="mb-2 font-tag text-foreground/60">{'// tables'}</div>
        <ul className="grid gap-1">
          {tables.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => setActiveTableId(t.id)}
                className={`w-full rounded px-2 py-1 text-left hover:bg-accent ${t.id === activeTableId ? 'bg-accent' : ''}`}
              >
                {t.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <main className="rounded-lg border border-border bg-surface/40 p-3">
        <p className="text-sm text-muted-foreground">Grid placeholder for <code className="font-mono">{activeTableId}</code>.</p>
      </main>
      <aside className="hidden rounded-lg border border-border bg-surface/40 p-3 text-sm md:block">
        <p className="text-muted-foreground">Profile panel placeholder.</p>
      </aside>
    </div>
  )
}
