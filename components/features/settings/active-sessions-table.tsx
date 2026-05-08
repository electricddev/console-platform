import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtDate, fmtRelativeTime } from '@/lib/format'
import type { ActiveSession } from '@/lib/api/types'

export function ActiveSessionsTable({
  sessions,
  onRevoke,
}: {
  sessions: ActiveSession[]
  onRevoke: (id: string) => Promise<void>
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Device</th>
            <th>IP</th>
            <th>Started</th>
            <th>Last seen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} className="border-t border-border/60">
              <td className="px-3 py-2">
                {s.device}
                {s.current && (
                  <Badge className="ml-2 border-success/30 bg-success/15 text-success">
                    current
                  </Badge>
                )}
              </td>
              <td className="px-3 py-2 font-mono text-xs">
                {s.ip}{' '}
                {s.city && (
                  <span className="text-muted-foreground">
                    · {s.city}, {s.country}
                  </span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground" title={fmtDate(s.createdAt)}>
                {fmtRelativeTime(s.createdAt)}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {fmtRelativeTime(s.lastSeenAt)}
              </td>
              <td className="px-3 py-2 text-right">
                {!s.current && (
                  <form
                    action={async () => {
                      'use server'
                      await onRevoke(s.id)
                    }}
                  >
                    <Button type="submit" variant="ghost" size="xs" className="text-destructive">
                      Revoke
                    </Button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
