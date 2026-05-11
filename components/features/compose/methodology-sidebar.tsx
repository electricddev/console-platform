'use client'

import type { Axis, Methodology } from '@/lib/data/methodology'
import { acredMethodology } from '@/lib/data/acred/methodology'
import { Button } from '@/components/ui/button'

const AXIS_ORDER: { id: Axis; label: string }[] = [
  { id: 'time', label: 'Time' },
  { id: 'segment', label: 'Segment' },
  { id: 'snapshot', label: 'Snapshot' },
]

type Props = {
  onAddMethodology: (m: Methodology) => void
  onAddMarkdown: () => void
  onAddBlankQuery: () => void
}

export function MethodologySidebar({ onAddMethodology, onAddMarkdown, onAddBlankQuery }: Props) {
  return (
    <aside className="rounded-lg border border-border bg-surface/40 p-3 text-sm">
      <div className="grid gap-3">
        <div className="grid gap-1">
          <div className="font-tag text-foreground/60">{'// methodology'}</div>
          {AXIS_ORDER.map((axis) => {
            const entries = acredMethodology.filter((m) => m.axis === axis.id)
            if (entries.length === 0) return null
            return (
              <div key={axis.id} className="grid gap-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{axis.label}</div>
                {entries.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onAddMethodology(m)}
                    title={m.description}
                    className="w-full rounded px-2 py-1.5 text-left hover:bg-accent"
                  >
                    <div className="text-sm">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.shape}</div>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
        <div className="grid gap-1 border-t border-border pt-3">
          <div className="font-tag text-foreground/60">{'// custom'}</div>
          <Button size="sm" variant="outline" onClick={onAddMarkdown}>Add markdown</Button>
          <Button size="sm" variant="outline" onClick={onAddBlankQuery}>Add custom query</Button>
        </div>
      </div>
    </aside>
  )
}
