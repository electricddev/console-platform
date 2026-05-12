import type { AttestationDiscipline } from '@/lib/api/schemas'
import { DemoBadge } from './demo-badge'

export function AttestationDisciplineTile({ discipline }: { discipline: AttestationDiscipline }) {
  return (
    <section aria-labelledby="discipline">
      <header className="mb-2 flex items-center gap-2">
        <h3 id="discipline" className="font-tag text-foreground/60">{'// issuer attestation discipline'}</h3>
        <DemoBadge title="Data-delivery discipline — not a credit rating. SLA tracking is illustrative until live system ships." />
      </header>
      <table className="w-full text-xs">
        <thead className="text-foreground/55">
          <tr>
            <th className="text-left py-1">Cadence</th>
            <th className="text-left">Metric</th>
            <th className="text-right">Delivered</th>
            <th className="text-right">On time</th>
          </tr>
        </thead>
        <tbody>
          {discipline.cadenceBreakdown.map((c) => (
            <tr key={c.cadence + c.metric} className="border-t border-border/60">
              <td className="py-1 capitalize">{c.cadence}</td>
              <td>{c.metric}</td>
              <td className="text-right tabular-nums">{c.delivered}/{c.expected}</td>
              <td className="text-right tabular-nums">{c.onTime}/{c.expected}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
