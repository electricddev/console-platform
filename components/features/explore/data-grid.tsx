'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import type { ColumnFilter, ResolvedColumn, SortState, TableDescriptor } from '@/lib/data/types'
import { Cell } from '@/lib/data/format-cell'
import { useTableSchema } from '@/lib/data/use-table-schema'
import { useTableQuery } from '@/lib/data/use-table-query'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { fmtNumber } from '@/lib/format'
import { FilterPopover } from './filter-popover'
import { EmptyState } from './empty-state'
import { LoadingState } from './loading-state'

const PAGE_SIZE = 50

type Props = {
  table: TableDescriptor
  filters: ColumnFilter[]
  sort: SortState
  onChangeSort: (sort: SortState) => void
  onUpsertFilter: (filter: ColumnFilter) => void
  onRemoveFilter: (column: string) => void
  onClearFilters: () => void
  onFocusColumn?: (column: ResolvedColumn) => void
}

export function DataGrid({
  table,
  filters,
  sort,
  onChangeSort,
  onUpsertFilter,
  onRemoveFilter,
  onClearFilters,
  onFocusColumn,
}: Props) {
  const schema = useTableSchema(table)
  const [page, setPage] = useState(0)

  // Reset page when filters or sort change
  useEffect(() => {
    setPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters), JSON.stringify(sort)])

  const query = useTableQuery({
    table: table.id,
    filters,
    sort,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  })

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!schema.ready) return []
    return schema.columns
      .filter((c) => !c.hidden)
      .map((c) => ({
        id: c.id,
        accessorKey: c.id,
        header: c.label,
        cell: ({ getValue }) => <Cell value={getValue()} column={c} />,
        meta: { column: c },
      }))
  }, [schema])

  const tableInstance = useReactTable({
    data: query.ready ? query.rows : [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (!schema.ready) {
    if (schema.error) {
      return <EmptyState message={`Failed to load schema: ${schema.error.message}`} />
    }
    return <LoadingState label="Loading schema…" />
  }

  if (!query.ready) {
    if (query.error) {
      return <EmptyState message={`Query failed: ${query.error.message}`} />
    }
    return <LoadingState label="Running query…" />
  }

  if (query.rows.length === 0) {
    if (filters.length > 0) {
      return (
        <EmptyState
          message="No rows match these filters."
          action={
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          }
        />
      )
    }
    return <EmptyState message="No rows in this table." />
  }

  const totalPages = Math.max(1, Math.ceil(query.totalCount / PAGE_SIZE))

  function toggleSort(columnId: string) {
    let nextSort: SortState
    if (!sort || sort.column !== columnId) {
      nextSort = { column: columnId, dir: 'asc' }
    } else if (sort.dir === 'asc') {
      nextSort = { column: columnId, dir: 'desc' }
    } else {
      nextSort = null
    }
    onChangeSort(nextSort)
    setPage(0)
  }

  return (
    <div className="grid gap-2">
      <div className="overflow-auto rounded-lg border border-border bg-surface/40">
        <table className="w-full text-sm">
          <thead className="bg-surface/80 text-muted-foreground">
            {tableInstance.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => {
                  const colMeta = h.column.columnDef.meta as { column: ResolvedColumn } | undefined
                  const col = colMeta?.column
                  const isSorted = sort?.column === h.id
                  return (
                    <th key={h.id} className="px-3 py-2 text-left font-medium">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleSort(h.id)}
                          className="inline-flex items-center gap-1 hover:text-foreground"
                          aria-label={`Sort by ${col?.label ?? h.id}`}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}
                          <span className={cn('text-xs', !isSorted && 'opacity-30')}>
                            {sort?.dir === 'desc' && isSorted ? '↓' : '↑'}
                          </span>
                        </button>
                        {col && (
                          <FilterPopover
                            column={col}
                            tableId={table.id}
                            current={filters.find((f) => f.column === col.id)}
                            onApply={(f) => onUpsertFilter(f)}
                            onClear={() => onRemoveFilter(col.id)}
                          >
                            <button
                              type="button"
                              className={cn(
                                'rounded p-1 text-xs hover:bg-accent',
                                filters.find((f) => f.column === col.id)
                                  ? 'text-foreground'
                                  : 'text-muted-foreground'
                              )}
                              aria-label={`Filter ${col.label}`}
                            >
                              ⌗
                            </button>
                          </FilterPopover>
                        )}
                        {col && onFocusColumn && (
                          <button
                            type="button"
                            onClick={() => onFocusColumn(col)}
                            className="ml-auto rounded p-1 text-xs text-muted-foreground hover:bg-accent"
                            aria-label={`Focus column ${col.label} in profile panel`}
                          >
                            ⌕
                          </button>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {tableInstance.getRowModel().rows.map((r) => (
              <tr key={r.id} className="border-b border-border/40 hover:bg-accent/30">
                {r.getVisibleCells().map((c) => (
                  <td key={c.id} className="px-3 py-1.5 align-middle">
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
        <div>
          {fmtNumber(query.totalCount)} rows · page {page + 1} of {totalPages}
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Prev
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
