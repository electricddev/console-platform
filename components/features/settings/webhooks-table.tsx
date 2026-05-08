import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime } from '@/lib/format'
import type { Webhook } from '@/lib/api/types'

type Props = { webhooks: Webhook[]; onToggle: (id: string) => Promise<void> }

export function WebhooksTable({ webhooks, onToggle }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2"><th>URL</th><th>Events</th><th>Status</th><th>Failures</th><th>Created</th><th></th></tr>
        </thead>
        <tbody>
          {webhooks.map((w) => (
            <tr key={w.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-mono text-xs">{w.url}</td>
              <td className="px-3 py-2">{w.events.map((e) => <Badge key={e} variant="outline" className="mr-1 font-tag text-[0.65rem]">{e}</Badge>)}</td>
              <td className="px-3 py-2">{w.active ? <Badge className="bg-success/15 text-success border-success/30">active</Badge> : <Badge variant="outline">paused</Badge>}</td>
              <td className="px-3 py-2 tabular-nums text-muted-foreground">{w.failureCount}</td>
              <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(w.createdAt)}</td>
              <td className="px-3 py-2 text-right">
                <form action={async () => { 'use server'; await onToggle(w.id) }}>
                  <Button type="submit" variant="ghost" size="xs">{w.active ? 'Pause' : 'Resume'}</Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
