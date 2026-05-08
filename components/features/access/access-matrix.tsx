import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtDate } from '@/lib/format'
import type { AccessGrant, Dataset, Org } from '@/lib/api/types'

type Props = {
  datasets: Dataset[]
  counterparties: Org[]
  grants: AccessGrant[]
}

const TONE: Record<AccessGrant['level'], string> = {
  none: 'bg-muted text-muted-foreground',
  read: 'bg-info/15 text-info border-info/30',
  execute: 'bg-success/15 text-success border-success/30',
}

export function AccessMatrix({ datasets, counterparties, grants }: Props) {
  function find(orgId: string, datasetId: string) {
    return grants.find((g) => g.counterpartyOrgId === orgId && g.datasetId === datasetId)
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr>
            <th className="px-3 py-2">Counterparty \ Dataset</th>
            {datasets.map((d) => (
              <th key={d.id} className="px-3 py-2">{d.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {counterparties.map((c) => (
            <tr key={c.id} className="border-t border-border/60">
              <td className="px-3 py-2 font-medium">{c.name}</td>
              {datasets.map((d) => {
                const g = find(c.id, d.id)
                if (!g) {
                  return (
                    <td key={d.id} className="px-3 py-2 text-muted-foreground">—</td>
                  )
                }
                return (
                  <td key={d.id} className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <Badge variant="outline" className={TONE[g.level]}>{g.level}</Badge>
                      <span className="text-[0.65rem] text-muted-foreground">{fmtNumber(g.rateLimitPerDay)}/day</span>
                      {g.expiresAt && (
                        <span className="text-[0.65rem] text-muted-foreground">
                          expires {fmtDate(g.expiresAt, { pattern: 'yyyy-MM-dd' })}
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
