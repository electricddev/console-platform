import Link from 'next/link'
import type { AnomalyEvent } from '@/lib/api/schemas'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

const sevTone: Record<AnomalyEvent['severity'], string> = {
  info:   'bg-foreground/10 text-foreground/70',
  low:    'bg-foreground/10 text-foreground/70',
  medium: 'bg-warning/10  text-warning',
  high:   'bg-danger/10   text-danger',
}

export function AnomalyFeed({ events, title = '// anomaly feed · last 30d' }: { events: AnomalyEvent[]; title?: string }) {
  return (
    <section aria-labelledby="anomalies">
      <h3 id="anomalies" className="font-tag text-foreground/60 mb-3">{title}</h3>
      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No events in this window.
        </p>
      ) : (
        <ul className="grid gap-2">
          {events.map((e) => {
            const when = formatDistanceToNow(new Date(e.occurredAt), { addSuffix: true })
            const titleNode = e.detailHref
              ? <Link href={e.detailHref} className="hover:underline">{e.title}</Link>
              : <span>{e.title}</span>
            return (
              <li key={e.id} className="flex items-start gap-3 rounded-md border border-border bg-surface/30 p-3">
                <span className={cn('rounded-sm px-2 py-0.5 text-[0.65rem] font-tag uppercase tracking-wider', sevTone[e.severity])}>
                  {e.kind}
                </span>
                <span className="text-xs text-muted-foreground w-28 shrink-0">{when}</span>
                <span className="text-sm flex-1">{titleNode}</span>
                {e.borrowerNormalized && (
                  <span className="text-xs text-muted-foreground">{e.borrowerNormalized}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
