'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useDuckDB } from '@/lib/data/use-duckdb'
import type { EnumFilter, ResolvedColumn } from '@/lib/data/types'

type Props = {
  column: ResolvedColumn
  initial: EnumFilter | undefined
  onApply: (filter: EnumFilter) => void
  onClear: () => void
  tableId: string
}

export function FilterWidgetEnum({ column, initial, onApply, onClear, tableId }: Props) {
  const { db, ready } = useDuckDB()
  const initialKeys = column.enumValues ? Object.keys(column.enumValues) : []
  const [options, setOptions] = useState<string[]>(initialKeys)
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.values ?? []))

  useEffect(() => {
    if (initialKeys.length > 0 || !ready || !db) return
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      try {
        const escaped = column.id.replace(/"/g, '""')
        const tableEscaped = tableId.replace(/"/g, '""')
        const res = await conn.query(
          `SELECT DISTINCT "${escaped}" AS v FROM "${tableEscaped}" WHERE "${escaped}" IS NOT NULL ORDER BY v LIMIT 50`
        )
        const vs = res.toArray().map((r) => String((r.toJSON() as { v: unknown }).v))
        if (!cancelled) setOptions(vs)
      } finally {
        await conn.close()
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, db, column.id, tableId, initialKeys.length])

  function toggle(v: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  return (
    <div className="grid gap-2">
      <div className="max-h-64 overflow-auto grid gap-1">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground">No values to filter.</p>
        ) : (
          options.map((v) => (
            <label key={v} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={selected.has(v)} onCheckedChange={() => toggle(v)} />
              <span className="font-mono text-xs">{column.enumValues?.[v]?.label ?? v}</span>
            </label>
          ))
        )}
      </div>
      <div className="flex justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelected(new Set())
            onClear()
          }}
        >
          Clear
        </Button>
        <Button
          size="sm"
          onClick={() => onApply({ kind: 'enum', column: column.id, values: Array.from(selected) })}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}
