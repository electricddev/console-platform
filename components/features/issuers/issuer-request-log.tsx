import type { IssuerRequest } from '@/lib/api/schemas'
import { formatDistanceToNow } from 'date-fns'

const kindLabel: Record<IssuerRequest['kind'], string> = {
  'attestation-request': 'Attestation request',
  'gap-acceptance': 'Gap acceptance',
  'sla-renegotiation': 'SLA renegotiation',
}

export function IssuerRequestLog({ requests }: { requests: IssuerRequest[] }) {
  return (
    <section aria-labelledby="request-log">
      <h3 id="request-log" className="mb-2 font-tag text-foreground/60">{'// interaction log'}</h3>
      {requests.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No requests sent yet.</p>
      ) : (
        <ul className="grid gap-2">
          {requests.map((r) => (
            <li key={r.id} className="rounded-md border border-border bg-surface/30 p-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-medium">{kindLabel[r.kind]}</span>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.requestedAt), { addSuffix: true })}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground capitalize">Status: {r.status}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
