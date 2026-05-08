import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import { AttestationBadge } from '@/components/common/attestation-badge'
import type { Dataset } from '@/lib/api/types'

export function WatchedDatasets({ datasets }: { datasets: Dataset[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Watched datasets</CardTitle>
        <Link href="/datasets" className="text-xs text-muted-foreground hover:text-foreground">
          Browse all →
        </Link>
      </CardHeader>
      <CardContent className="grid gap-3">
        {datasets.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No watched datasets yet.</p>
        ) : (
          datasets.map((d) => (
            <Link
              key={d.id}
              href={`/datasets/${d.id}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-md border border-border/70 bg-surface/50 px-3 py-2 hover:bg-surface"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium">{d.name}</p>
                  <Badge variant="outline" className="font-tag text-[0.6rem]">{d.assetClass}</Badge>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {fmtNumber(d.recordCount)} records · completeness {fmtPct(d.completenessPct)}
                </p>
              </div>
              <FreshnessIndicator timestamp={d.lastAttestedAt} />
              <AttestationBadge attestation={d.attestation} compact />
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
