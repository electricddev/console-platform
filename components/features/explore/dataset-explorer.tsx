'use client'

import { useEffect, useMemo, useReducer } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { ColumnFilter, ResolvedColumn, SortState, TableDescriptor } from '@/lib/data/types'
import { useDuckDB } from '@/lib/data/use-duckdb'
import { encodeFilterState, decodeFilterState } from '@/lib/data/filters'
import { LoadingState } from './loading-state'
import { ErrorState } from './error-state'
import { TablePicker } from './table-picker'
import { DataGrid } from './data-grid'
import { ExploreToolbar } from './explore-toolbar'
import { ColumnProfilePanel } from './column-profile-panel'

type ExplorerState = {
  activeTableId: string
  filters: ColumnFilter[]
  sort: SortState
  totalCount: number | null
  columns: ResolvedColumn[]
  focusedColumn: ResolvedColumn | null
}

type ExplorerAction =
  | { type: 'set-table'; id: string }
  | { type: 'set-sort'; sort: SortState }
  | { type: 'upsert-filter'; filter: ColumnFilter }
  | { type: 'remove-filter'; column: string }
  | { type: 'clear-filters' }
  | { type: 'set-metrics'; totalCount: number; columns: ResolvedColumn[] }
  | { type: 'set-focused-column'; column: ResolvedColumn }

function makeReducer(tables: TableDescriptor[]) {
  return function reducer(state: ExplorerState, action: ExplorerAction): ExplorerState {
    switch (action.type) {
      case 'set-table': {
        const newTable = tables.find((t) => t.id === action.id)
        return {
          activeTableId: action.id,
          filters: [],
          sort: newTable?.defaultSort ?? null,
          totalCount: null,
          columns: [],
          focusedColumn: null,
        }
      }
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
      case 'set-metrics': {
        const pk = tables.find((t) => t.id === state.activeTableId)?.primaryKey
        const pkCol = action.columns.find((c) => c.id === pk) ?? action.columns[0] ?? null
        const focusedColumn = state.focusedColumn && action.columns.some((c) => c.id === state.focusedColumn!.id)
          ? state.focusedColumn
          : pkCol
        return { ...state, totalCount: action.totalCount, columns: action.columns, focusedColumn }
      }
      case 'set-focused-column':
        return { ...state, focusedColumn: action.column }
    }
  }
}

type Props = { datasetId: string; tables: TableDescriptor[] }

export function DatasetExplorer({ datasetId: _datasetId, tables }: Props) {
  const { ready, db, error } = useDuckDB()
  const search = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialState: ExplorerState = (() => {
    const encoded = search.get('f')
    if (encoded) {
      const decoded = decodeFilterState(encoded)
      if (decoded && tables.some((t) => t.id === decoded.table)) {
        return {
          activeTableId: decoded.table,
          filters: decoded.filters,
          sort: decoded.sort,
          totalCount: null,
          columns: [],
          focusedColumn: null,
        }
      }
    }
    const firstTable = tables[0]
    return {
      activeTableId: firstTable?.id ?? '',
      filters: [],
      sort: firstTable?.defaultSort ?? null,
      totalCount: null,
      columns: [],
      focusedColumn: null,
    }
  })()

  const reducer = useMemo(() => makeReducer(tables), [tables])
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    const encoded = encodeFilterState({
      table: state.activeTableId,
      filters: state.filters,
      sort: state.sort,
    })
    const params = new URLSearchParams(search.toString())
    if (state.filters.length === 0 && !state.sort && state.activeTableId === tables[0]?.id) {
      params.delete('f')
    } else {
      params.set('f', encoded)
    }
    const q = params.toString()
    router.replace(`${pathname}${q ? `?${q}` : ''}`, { scroll: false })
  }, [state.activeTableId, state.filters, state.sort, pathname, router, search, tables])

  if (error) {
    return (
      <ErrorState
        message={`Failed to start the query engine: ${error.message}`}
        onRetry={() => window.location.reload()}
      />
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
      <main className="grid gap-2">
        <ExploreToolbar
          db={db}
          tableId={state.activeTableId}
          columns={state.columns}
          filters={state.filters}
          sort={state.sort}
          totalCount={state.totalCount}
          onRemoveFilter={(c) => dispatch({ type: 'remove-filter', column: c })}
          onClearFilters={() => dispatch({ type: 'clear-filters' })}
        />
        <div className="rounded-lg border border-border bg-surface/40 p-3">
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
              onFocusColumn={(c) => dispatch({ type: 'set-focused-column', column: c })}
              onMetrics={(m) => dispatch({ type: 'set-metrics', totalCount: m.totalCount, columns: m.columns })}
            />
          )}
        </div>
      </main>
      <ColumnProfilePanel
        tableId={state.activeTableId}
        column={state.focusedColumn}
        filters={state.filters}
      />
    </div>
  )
}
