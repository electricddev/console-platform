'use client'

import { useState } from 'react'
import type { TableDescriptor } from '@/lib/data/types'
import { useDuckDB } from '@/lib/data/use-duckdb'
import { LoadingState } from './loading-state'
import { TablePicker } from './table-picker'

type Props = { datasetId: string; tables: TableDescriptor[] }

export function DatasetExplorer({ datasetId: _datasetId, tables }: Props) {
  const { ready, db, error } = useDuckDB()
  const [activeTableId, setActiveTableId] = useState<string>(tables[0]?.id ?? '')

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        Failed to start the query engine: {error.message}
      </div>
    )
  }

  if (!ready || !db) {
    return <LoadingState />
  }

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <TablePicker db={db} tables={tables} activeId={activeTableId} onSelect={setActiveTableId} />
      <main className="rounded-lg border border-border bg-surface/40 p-3">
        <p className="text-sm text-muted-foreground">Grid placeholder for <code className="font-mono">{activeTableId}</code>.</p>
      </main>
      <aside className="hidden rounded-lg border border-border bg-surface/40 p-3 text-sm md:block">
        <p className="text-muted-foreground">Profile panel placeholder.</p>
      </aside>
    </div>
  )
}
