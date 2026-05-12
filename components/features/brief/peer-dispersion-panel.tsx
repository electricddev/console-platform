import type { PeerDispersionRow } from '@/lib/api/schemas'
import { DemoBadge } from './demo-badge'

export function PeerDispersionPanel({ rows }: { rows: PeerDispersionRow[] }) {
  return (
    <section aria-labelledby="peer-dispersion">
      <header className="mb-2 flex items-center gap-2">
        <h3 id="peer-dispersion" className="font-tag text-foreground/60">{'// peer dispersion'}</h3>
        <DemoBadge title="Cross-fund consensus pricing — illustrative until peer-fund integration ships" />
      </header>
      <ul className="grid gap-2">
        {rows.map((r) => (
          <li key={r.borrowerNormalized} className="rounded-md border border-border bg-surface/30 p-3 text-xs">
            <p className="font-medium">{r.borrowerNormalized}</p>
            <p className="mt-1 text-muted-foreground">
              {r.marks.map((m) => `${m.fund} ${m.mark.toFixed(1)}`).join(' · ')}
              {' · '}dispersion {r.dispersionPoints.toFixed(1)}pt
            </p>
            {r.commentary && <p className="mt-1 text-muted-foreground">{r.commentary}</p>}
          </li>
        ))}
      </ul>
    </section>
  )
}
