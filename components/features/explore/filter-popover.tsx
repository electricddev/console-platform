'use client'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { ColumnFilter, Format, ResolvedColumn } from '@/lib/data/types'
import { FilterWidgetNumeric } from './filter-widget-numeric'
import { FilterWidgetEnum } from './filter-widget-enum'
import { FilterWidgetDate } from './filter-widget-date'
import { FilterWidgetText } from './filter-widget-text'
import { FilterWidgetBoolean } from './filter-widget-boolean'

type Props = {
  column: ResolvedColumn
  tableId: string
  current: ColumnFilter | undefined
  onApply: (filter: ColumnFilter) => void
  onClear: () => void
  children: React.ReactNode
}

const NUMERIC: ReadonlyArray<Format> = ['currency', 'percent', 'bps', 'integer', 'decimal']

export function FilterPopover({ column, tableId, current, onApply, onClear, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {NUMERIC.includes(column.format) && (
          <FilterWidgetNumeric
            column={column.id}
            initial={current?.kind === 'numeric' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {column.format === 'enum' && (
          <FilterWidgetEnum
            column={column}
            tableId={tableId}
            initial={current?.kind === 'enum' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {(column.format === 'date' || column.format === 'datetime') && (
          <FilterWidgetDate
            column={column.id}
            initial={current?.kind === 'date' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {(column.format === 'text' || column.format === 'identifier') && (
          <FilterWidgetText
            column={column.id}
            initial={current?.kind === 'text' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
        {column.format === 'boolean' && (
          <FilterWidgetBoolean
            column={column.id}
            initial={current?.kind === 'boolean' ? current : undefined}
            onApply={onApply}
            onClear={onClear}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
