import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { fmtNumber, fmtPct, fmtRelativeTime } from '@/lib/format'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { cn } from '@/lib/utils'
import type { Dataset } from '@/lib/api/types'

const ASSET_LABEL: Record<string, string> = {
  'private-credit': 'Private credit',
  'public-equity': 'Public equity',
  'real-estate': 'Real estate',
  'private-equity': 'Private equity',
  treasuries: 'Treasuries',
  commodities: 'Commodities',
  fx: 'FX',
  crypto: 'Crypto',
}

function freshnessTone(timestamp: string): { tone: string; label: 'live' | 'fresh' | 'stale' } {
  const ageMs = Date.now() - new Date(timestamp).getTime()
  if (ageMs < 60_000) return { tone: 'bg-success', label: 'live' }
  if (ageMs < 3 * 3_600_000) return { tone: 'bg-info', label: 'fresh' }
  return { tone: 'bg-warning', label: 'stale' }
}

export function WatchedDatasets({ datasets }: { datasets: Dataset[] }) {
  return (
    <section aria-labelledby="watched-datasets" className="grid">
      <header className="flex items-baseline justify-between border-b border-border pb-3">
        <h3 id="watched-datasets" className="font-display text-xl tracking-tight">
          On your watchlist
        </h3>
        <Link
          href="/datasets"
          className="font-tag text-foreground/55 transition-colors hover:text-foreground"
        >
          {'// browse all →'}
        </Link>
      </header>

      {datasets.length === 0 ? (
        <p className="px-1 py-10 text-sm italic text-muted-foreground">
          You&apos;re not watching any datasets yet.
        </p>
      ) : (
        <ul className="grid">
          {datasets.map((d) => {
            const fresh = freshnessTone(d.lastAttestedAt)
            const completeness = Math.max(0, Math.min(1, d.completenessPct))
            const completenessTone =
              completeness >= 0.97
                ? 'bg-success'
                : completeness >= 0.85
                  ? 'bg-foreground/70'
                  : 'bg-warning'

            return (
              <li key={d.id}>
                <Link
                  href={`/datasets/${d.id}`}
                  className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 border-b border-border/70 py-4 transition-colors hover:bg-muted/30"
                >
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex items-baseline gap-3">
                      <span className="truncate text-[0.95rem] font-medium text-foreground">
                        {d.name}
                      </span>
                      <span className="hidden font-tag text-foreground/55 md:inline">
                        {ASSET_LABEL[d.assetClass] ?? d.assetClass}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[0.72rem] text-muted-foreground tabular-nums">
                      <span>{fmtNumber(d.recordCount)} records</span>
                      <span aria-hidden className="text-foreground/30">·</span>
                      <span>{d.templateCount} templates</span>
                      <span aria-hidden className="text-foreground/30">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className={cn('size-1.5 rounded-full', fresh.tone, fresh.label === 'live' && 'animate-pulse')} />
                        {fmtRelativeTime(d.lastAttestedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="hidden w-32 grid-rows-[auto_1fr] gap-1 md:grid">
                      <div className="flex items-baseline justify-between">
                        <span className="font-tag text-foreground/45">complete</span>
                        <span className="font-mono text-[0.7rem] tabular-nums text-foreground/80">
                          {fmtPct(completeness, { decimals: 1 })}
                        </span>
                      </div>
                      <div className="h-[2px] w-full bg-border">
                        <div
                          className={cn('h-full transition-[width]', completenessTone)}
                          style={{ width: `${completeness * 100}%` }}
                        />
                      </div>
                    </div>
                    <AttestationBadge attestation={d.attestation} compact />
                    <ArrowRight className="size-3.5 text-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
