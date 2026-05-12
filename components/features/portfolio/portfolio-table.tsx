import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fixtures } from '@/lib/api/fixtures'
import { DeltaCell } from './delta-cell'
import { AttestationCell } from './attestation-cell'
import type { Dataset } from '@/lib/api/schemas'

const formatUsd = (v: number) =>
  v >= 1e9 ? `$${(v / 1e9).toFixed(2)}B` : `$${(v / 1e6).toFixed(0)}M`
const formatPp = (v: number) => `${v.toFixed(2)}%`
const formatLev = (v: number) => `${(v * 100).toFixed(1)}%`

export function PortfolioTable({ datasets }: { datasets: Dataset[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Asset</th>
            <th>Class</th>
            <th className="text-right">NAV</th>
            <th className="text-right">Leverage</th>
            <th className="text-right">Non-accrual</th>
            <th>Attestation</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((d) => {
            const org = fixtures.orgs.find((o) => o.id === d.originatorOrgId)
            const v = d.briefSnapshot?.vitals
            return (
              <tr key={d.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <span className="inline-flex items-center gap-2">
                    <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
                    {d.alerts.length > 0 && (
                      <span
                        className="inline-block size-1.5 rounded-full bg-warning"
                        aria-label={`${d.alerts.length} alerts`}
                      />
                    )}
                  </span>
                  <p className="text-xs text-muted-foreground">{org?.name ?? d.originatorOrgId}</p>
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className="font-tag text-[0.65rem]">
                    {d.assetClass}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={v?.nav} formatValue={formatUsd} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={v?.leverage} formatValue={formatLev} />
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  <DeltaCell delta={v?.nonAccrualPct} formatValue={formatPp} />
                </td>
                <td className="px-3 py-2">
                  <AttestationCell onTimePct={undefined} lastAttestedAt={d.lastAttestedAt} />
                </td>
                <td className="px-3 py-2">
                  <Badge variant="outline">{d.status}</Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {datasets.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          No datasets match these filters.
        </p>
      )}
    </div>
  )
}
