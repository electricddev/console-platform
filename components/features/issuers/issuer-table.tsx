import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { IssuerCompliance, Org } from '@/lib/api/schemas'

function onTimePct(d: IssuerCompliance['discipline']): number {
  if (d.expectedLast30d === 0) return 0
  return Math.round((d.onTimeLast30d / d.expectedLast30d) * 100)
}

export function IssuerTable({ issuers, orgs }: { issuers: IssuerCompliance[]; orgs: Org[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Issuer</th>
            <th className="text-right">Assets</th>
            <th className="text-right">30d on-time</th>
            <th className="text-right">Open requests</th>
          </tr>
        </thead>
        <tbody>
          {issuers.map((i) => {
            const org = orgs.find((o) => o.id === i.issuerId)
            return (
              <tr key={i.issuerId} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/issuers/${i.issuerId}`} className="font-medium hover:underline">{org?.name ?? i.issuerId}</Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{i.assetIds.length}</td>
                <td className="px-3 py-2 text-right tabular-nums">{onTimePct(i.discipline)}%</td>
                <td className="px-3 py-2 text-right">
                  {i.openRequestCount > 0 ? <Badge variant="outline">{i.openRequestCount}</Badge> : <span className="text-muted-foreground">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {issuers.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">No issuers in the portfolio.</p>
      )}
    </div>
  )
}
