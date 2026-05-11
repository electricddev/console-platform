'use client'

import { useReducer } from 'react'
import type { ColumnFilter, SortState, TableDescriptor } from '@/lib/data/types'
import { useDuckDB } from '@/lib/data/use-duckdb'
import { LoadingState } from './loading-state'
import { TablePicker } from './table-picker'
import { DataGrid } from './data-grid'

type ExplorerState = {
  activeTableId: string
  filters: ColumnFilter[]
  sort: SortState
}

type ExplorerAction =
  | { type: 'set-table'; id: string }
  | { type: 'set-sort'; sort: SortState }
  | { type: 'upsert-filter'; filter: ColumnFilter }
  | { type: 'remove-filter'; column: string }
  | { type: 'clear-filters' }

function reducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
  switch (action.type) {
    case 'set-table':
      return { activeTableId: action.id, filters: [], sort: null }
    case 'set-sort':
      return { ...state, sort: action.sort }
    case 'upsert-filter': {
      const others = state.filters.filter((f) => f.column !== action.filter.column)
      return { ...state, filters: [...others, action.filter] }
    }
    case 'remove-filter':
      return { ...state, filters: state.filters.filter((f) => f.column !== action.column) }
    case 'clear-filters':
      return { ...state, filters: [] }
  }
}

type Props = { datasetId: string; tables: TableDescriptor[] }

export function DatasetExplorer({ datasetId: _datasetId, tables }: Props) {
  const { ready, db, error } = useDuckDB()
  const [state, dispatch] = useReducer(reducer, {
    activeTableId: tables[0]?.id ?? '',
    filters: [],
    sort: null,
  })

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
        Failed to start the query engine: {error.message}
      </div>
    )
  }

  if (!ready || !db) return <LoadingState />

  const activeTable = tables.find((t) => t.id === state.activeTableId) ?? null

  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <TablePicker
        db={db}
        tables={tables}
        activeId={state.activeTableId}
        onSelect={(id) => dispatch({ type: 'set-table', id })}
      />
      <main className="rounded-lg border border-border bg-surface/40 p-3">
        {activeTable && (
          <DataGrid
            key={activeTable.id}
            table={activeTable}
            filters={state.filters}
            sort={state.sort}
            onChangeSort={(s) => dispatch({ type: 'set-sort', sort: s })}
            onUpsertFilter={(f) => dispatch({ type: 'upsert-filter', filter: f })}
            onRemoveFilter={(c) => dispatch({ type: 'remove-filter', column: c })}
            onClearFilters={() => dispatch({ type: 'clear-filters' })}
          />
        )}
      </main>
      <aside className="hidden rounded-lg border border-border bg-surface/40 p-3 text-sm md:block">
        <p className="text-muted-foreground">Profile panel placeholder.</p>
      </aside>
    </div>
  )
}
