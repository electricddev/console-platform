'use client'
import Link from 'next/link'
import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { AlertFilterBar } from './alert-filter-bar'
import type { AnomalyEvent } from '@/lib/api/schemas'

const sevTone: Record<AnomalyEvent['severity'], string> = {
  info: 'bg-foreground/10', low: 'bg-foreground/10',
  medium: 'bg-warning/10 text-warning', high: 'bg-danger/10 text-danger',
}

type FilterState = { kinds: AnomalyEvent['kind'][]; severities: AnomalyEvent['severity'][] }

export function AlertFeed({ events }: { events: AnomalyEvent[] }) {
  const [filter, setFilter] = useState<FilterState>({ kinds: [], severities: [] })
  const filtered = events
    .filter((e) => filter.kinds.length === 0 || filter.kinds.includes(e.kind))
    .filter((e) => filter.severities.length === 0 || filter.severities.includes(e.severity))

  return (
    <div className="grid gap-3">
      <AlertFilterBar onChange={setFilter} />
      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No matching events.</p>
      ) : (
        <ul className="grid gap-2">
          {filtered.map((e) => {
            const when = formatDistanceToNow(new Date(e.occurredAt), { addSuffix: true })
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-md border border-border bg-surface/30 p-3">
                <span className={cn('rounded-sm px-2 py-0.5 text-[0.65rem] font-tag uppercase', sevTone[e.severity])}>{e.kind}</span>
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{when}</span>
                <span className="flex-1 text-sm">
                  {e.detailHref ? <Link href={e.detailHref} className="hover:underline">{e.title}</Link> : e.title}
                </span>
                {e.borrowerNormalized && <span className="text-xs text-muted-foreground">{e.borrowerNormalized}</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
