import type { Memo } from '@/lib/api/schemas'
import { formatDistanceToNow } from 'date-fns'

export function MemoAuditLog({ memo }: { memo: Memo }) {
  const events: { ts: string; label: string }[] = []
  events.push({ ts: memo.createdAt, label: 'Draft created' })
  events.push({ ts: memo.updatedAt, label: 'Last edited' })
  if (memo.submittedAt) events.push({ ts: memo.submittedAt, label: 'Submitted for IC review' })
  if (memo.approvedAt) events.push({ ts: memo.approvedAt, label: `Approved by ${memo.approvedBy ?? 'admin'}` })
  for (const d of memo.flagDecisions) {
    events.push({ ts: d.decidedAt, label: `${d.action} on ${d.flagId}` })
  }
  events.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())

  return (
    <section aria-labelledby="memo-audit">
      <h4 id="memo-audit" className="mb-2 font-tag text-xs text-foreground/55">{'// audit log'}</h4>
      <ul className="grid gap-1 text-xs">
        {events.map((e, i) => (
          <li key={i} className="flex items-center justify-between text-muted-foreground">
            <span>{e.label}</span>
            <span className="tabular-nums">{formatDistanceToNow(new Date(e.ts), { addSuffix: true })}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
