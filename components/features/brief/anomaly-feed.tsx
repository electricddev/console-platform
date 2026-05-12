import type { ReactNode } from 'react'
import type { AnomalyEvent } from '@/lib/api/schemas'
import { AnomalyRow } from './anomaly-row'

type Props = {
  events: AnomalyEvent[]
  title?: string
  renderActions?: (event: AnomalyEvent) => ReactNode
}

export function AnomalyFeed({ events, title = '// anomaly feed · last 30d', renderActions }: Props) {
  return (
    <section aria-labelledby="anomalies">
      <h3 id="anomalies" className="font-tag text-foreground/60 mb-3">{title}</h3>
      {events.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No events in this window.</p>
      ) : (
        <ul className="grid gap-2">
          {events.map((e) => <AnomalyRow key={e.id} event={e} actions={renderActions?.(e)} />)}
        </ul>
      )}
    </section>
  )
}
