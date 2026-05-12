import Link from 'next/link'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Dataset } from '@/lib/api/schemas'

export function IssuerAssetRoster({ datasets }: { datasets: Dataset[] }) {
  return (
    <section aria-labelledby="asset-roster">
      <h3 id="asset-roster" className="mb-2 font-tag text-foreground/60">{'// asset roster'}</h3>
      <ul className="grid gap-2">
        {datasets.map((d) => (
          <li key={d.id} className="flex items-center justify-between rounded-md border border-border bg-surface/30 p-3 text-sm">
            <Link href={`/datasets/${d.id}`} className="font-medium hover:underline">{d.name}</Link>
            <span className="text-xs text-muted-foreground">
              <FreshnessIndicator timestamp={d.lastAttestedAt} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
