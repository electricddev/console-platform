import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime } from '@/lib/format'
import type { Member } from '@/lib/api/types'

type Props = { members: Member[]; onRemove: (id: string) => Promise<void> }

export function MembersTable({ members, onRemove }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Invited</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-medium">{m.name}</td>
              <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{m.email}</td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="font-tag text-[0.65rem]">
                  {m.role}
                </Badge>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {m.acceptedAt ? 'active' : 'invited'}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(m.invitedAt)}</td>
              <td className="px-3 py-2 text-right">
                <form
                  action={async () => {
                    'use server'
                    await onRemove(m.id)
                  }}
                >
                  <Button type="submit" variant="ghost" size="xs">
                    Remove
                  </Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
