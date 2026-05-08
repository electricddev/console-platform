import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fmtRelativeTime } from '@/lib/format'
import type { Wallet } from '@/lib/api/types'

type Props = {
  wallets: Wallet[]
  onSetPrimary: (id: string) => Promise<void>
  onRemove: (id: string) => Promise<void>
}

export function WalletsTable({ wallets, onSetPrimary, onRemove }: Props) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Label</th>
            <th>Address</th>
            <th>Kind</th>
            <th>Primary</th>
            <th>Added</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {wallets.map((w) => (
            <tr key={w.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-medium">{w.label}</td>
              <td className="px-3 py-2">
                <CopyableHash value={w.address} />
              </td>
              <td className="px-3 py-2">
                <Badge variant="outline" className="font-tag text-[0.65rem]">
                  {w.kind}
                </Badge>
              </td>
              <td className="px-3 py-2">
                {w.isPrimary ? (
                  <Badge className="bg-success/15 text-success border-success/30">
                    primary
                  </Badge>
                ) : (
                  <form
                    action={async () => {
                      'use server'
                      await onSetPrimary(w.id)
                    }}
                  >
                    <Button type="submit" variant="ghost" size="xs">
                      Set primary
                    </Button>
                  </form>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {fmtRelativeTime(w.addedAt)}
              </td>
              <td className="px-3 py-2 text-right">
                <form
                  action={async () => {
                    'use server'
                    await onRemove(w.id)
                  }}
                >
                  <Button
                    type="submit"
                    variant="ghost"
                    size="xs"
                    disabled={w.isPrimary}
                  >
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
