import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime } from '@/lib/format'
import type { ApiKey } from '@/lib/api/types'

type Props = { keys: ApiKey[]; onRevoke: (id: string) => Promise<void> }

export function ApiKeysTable({ keys, onRevoke }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2"><th>Label</th><th>Prefix</th><th>Scopes</th><th>Created</th><th>Last used</th><th></th></tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-medium">{k.label}</td>
              <td className="px-3 py-2 font-mono text-xs">{k.prefix}…</td>
              <td className="px-3 py-2">{k.scopes.map((s) => <Badge key={s} variant="outline" className="mr-1 font-tag text-[0.65rem]">{s}</Badge>)}</td>
              <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(k.createdAt)}</td>
              <td className="px-3 py-2 text-muted-foreground">{k.lastUsedAt ? fmtRelativeTime(k.lastUsedAt) : 'never'}</td>
              <td className="px-3 py-2 text-right">
                <form action={async () => { 'use server'; await onRevoke(k.id) }}>
                  <Button type="submit" variant="ghost" size="xs" className="text-destructive">Revoke</Button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
