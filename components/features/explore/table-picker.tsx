'use client'

import { useEffect, useState } from 'react'
import type * as duckdb from '@duckdb/duckdb-wasm'
import type { TableDescriptor } from '@/lib/data/types'
import { cn } from '@/lib/utils'
import { fmtNumber } from '@/lib/format'

type Props = {
  db: duckdb.AsyncDuckDB
  tables: TableDescriptor[]
  activeId: string
  onSelect: (id: string) => void
}

export function TablePicker({ db, tables, activeId, onSelect }: Props) {
  const [counts, setCounts] = useState<Record<string, number | null>>({})

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const conn = await db.connect()
      try {
        for (const t of tables) {
          const res = await conn.query(`SELECT COUNT(*)::BIGINT AS c FROM "${t.id}"`)
          const c = Number((res.toArray()[0] as unknown as { c: bigint }).c)
          if (cancelled) return
          setCounts((prev) => ({ ...prev, [t.id]: c }))
        }
      } finally {
        await conn.close()
      }
    })()
    return () => { cancelled = true }
  }, [db, tables])

  return (
    <aside className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
      <div className="mb-2 font-tag text-foreground/60">{'// tables'}</div>
      <ul className="grid gap-1">
        {tables.map((t) => {
          const active = t.id === activeId
          const count = counts[t.id]
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => onSelect(t.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'w-full rounded px-2 py-1.5 text-left hover:bg-accent',
                  active && 'bg-accent text-foreground',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span>{t.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {count == null ? '…' : fmtNumber(count)}
                  </span>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
