import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { fixtures } from '@/lib/api/fixtures'
import type { Dataset } from '@/lib/api/types'

const statusTone: Record<Dataset['status'], string> = {
  active: 'bg-success/15 text-success border-success/30',
  paused: 'bg-warning/15 text-warning border-warning/30',
  archived: 'bg-muted text-muted-foreground border-border',
}

export function DatasetTable({ datasets }: { datasets: Dataset[] }) {
  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Name</th>
            <th>Originator</th>
            <th>Asset class</th>
            <th className="text-right">Records</th>
            <th className="text-right">Completeness</th>
            <th>Last attested</th>
            <th className="text-right">Templates</th>
            <th>Status</th>
            <th className="sr-only">Attestation</th>
          </tr>
        </thead>
        <tbody>
          {datasets.map((d) => {
            const org = fixtures.orgs.find((o) => o.id === d.originatorOrgId)
            return (
              <tr key={d.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">
                    {d.name}
                  </Link>
                  {d.alerts.length > 0 && (
                    <span className="ml-2 inline-block size-1.5 rounded-full bg-warning" aria-label={`${d.alerts.length} alerts`} />
                  )}
                </td>
                <td className="px-3 py-2 text-muted-foreground">{org?.name ?? d.originatorOrgId}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{d.assetClass}</Badge></td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtNumber(d.recordCount)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtPct(d.completenessPct)}</td>
                <td className="px-3 py-2"><FreshnessIndicator timestamp={d.lastAttestedAt} /></td>
                <td className="px-3 py-2 text-right tabular-nums">{d.templateCount}</td>
                <td className="px-3 py-2"><Badge variant="outline" className={statusTone[d.status]}>{d.status}</Badge></td>
                <td className="px-3 py-2"><AttestationBadge attestation={d.attestation} compact /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {datasets.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">No datasets match these filters.</p>
      )}
    </div>
  )
}
