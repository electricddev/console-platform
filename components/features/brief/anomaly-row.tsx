import Link from 'next/link'
import type { ReactNode } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AnomalyEvent } from '@/lib/api/schemas'

const sevTone: Record<AnomalyEvent['severity'], string> = {
  info: 'bg-foreground/10 text-foreground/70', low: 'bg-foreground/10 text-foreground/70',
  medium: 'bg-warning/10 text-warning', high: 'bg-danger/10 text-danger',
}

export function AnomalyRow({ event, actions }: { event: AnomalyEvent; actions?: ReactNode }) {
  const when = formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })
  const title = event.detailHref
    ? <Link href={event.detailHref} className="hover:underline">{event.title}</Link>
    : <span>{event.title}</span>
  return (
    <li className="grid gap-2 rounded-md border border-border bg-surface/30 p-3">
      <div className="flex items-start gap-3">
        <span className={cn('rounded-sm px-2 py-0.5 text-[0.65rem] font-tag uppercase tracking-wider', sevTone[event.severity])}>
          {event.kind}
        </span>
        <span className="text-xs text-muted-foreground w-28 shrink-0">{when}</span>
        <span className="text-sm flex-1">{title}</span>
        {event.borrowerNormalized && <span className="text-xs text-muted-foreground">{event.borrowerNormalized}</span>}
      </div>
      {actions}
    </li>
  )
}
