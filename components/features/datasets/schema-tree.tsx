import { FieldExposureBadge } from './field-exposure-badge'
import { Badge } from '@/components/ui/badge'
import type { Schema } from '@/lib/api/types'

export function SchemaTree({ schema }: { schema: Schema }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Field</th>
            <th>Type</th>
            <th>Exposure</th>
            <th>Min bucket</th>
            <th>Operators</th>
            <th>PII</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {schema.fields.map((f) => (
            <tr key={f.name} className="border-t border-border/60">
              <td className="px-3 py-2 font-mono text-xs">{f.name}</td>
              <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{f.type}</Badge></td>
              <td className="px-3 py-2"><FieldExposureBadge exposure={f.exposure} /></td>
              <td className="px-3 py-2 text-muted-foreground tabular-nums">{f.minBucketSize ?? '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">
                {f.allowedOperators?.map((o) => <span key={o} className="mr-1 font-mono text-xs">{o}</span>) ?? '—'}
              </td>
              <td className="px-3 py-2">{f.isPii ? <Badge variant="outline" className="border-warning/40 text-warning">PII</Badge> : '—'}</td>
              <td className="px-3 py-2 text-muted-foreground">{f.description ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
