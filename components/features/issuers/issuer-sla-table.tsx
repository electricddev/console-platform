import type { AttestationDiscipline } from '@/lib/api/schemas'

export function IssuerSlaTable({ discipline }: { discipline: AttestationDiscipline }) {
  return (
    <section aria-labelledby="sla">
      <h3 id="sla" className="mb-2 font-tag text-foreground/60">{'// sla terms'}</h3>
      <table className="w-full text-sm">
        <thead className="text-foreground/55">
          <tr className="[&>th]:py-1.5 text-left">
            <th>Cadence</th><th>Metric</th><th className="text-right">Delivered</th><th className="text-right">On time</th>
          </tr>
        </thead>
        <tbody>
          {discipline.cadenceBreakdown.map((c) => (
            <tr key={c.cadence + c.metric} className="border-t border-border/60">
              <td className="py-1.5 capitalize">{c.cadence}</td>
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
