import Link from 'next/link'
import { fmtDuration, fmtRelativeTime } from '@/lib/format'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { cn } from '@/lib/utils'
import type { Run } from '@/lib/api/types'

const STATUS_DOT: Record<Run['status'], string> = {
  queued: 'bg-foreground/30',
  running: 'bg-info animate-pulse',
  attesting: 'bg-info animate-pulse',
  anchoring: 'bg-info animate-pulse',
  completed: 'bg-success',
  failed: 'bg-destructive',
  disputed: 'bg-warning',
}

const STATUS_LABEL: Record<Run['status'], string> = {
  queued: 'queued',
  running: 'running',
  attesting: 'attesting',
  anchoring: 'anchoring',
  completed: 'done',
  failed: 'failed',
  disputed: 'disputed',
}

export function RecentRunsStrip({ runs }: { runs: Run[] }) {
  return (
    <section aria-labelledby="recent-runs" className="grid">
      <header className="flex items-baseline justify-between border-b border-border pb-3">
        <h3 id="recent-runs" className="font-display text-xl tracking-tight">
          Recent runs
        </h3>
        <Link
          href="/runs"
          className="font-tag text-foreground/55 transition-colors hover:text-foreground"
        >
          {'// view all →'}
        </Link>
      </header>

      {runs.length === 0 ? (
        <p className="px-1 py-10 text-sm italic text-muted-foreground">No runs yet.</p>
      ) : (
        <ol className="grid">
          {runs.map((r) => (
            <li key={r.id}>
              <Link
                href={`/runs/${r.id}`}
                className="group grid grid-cols-[1.25rem_1fr_auto_auto_auto] items-center gap-x-4 gap-y-1 border-b border-border/70 py-3 transition-colors hover:bg-muted/30"
              >
                <span
                  aria-hidden
                  className={cn('size-2 rounded-full justify-self-center', STATUS_DOT[r.status])}
                />
                <div className="grid min-w-0">
                  <p className="truncate text-[0.9rem] font-medium leading-tight text-foreground">
                    {r.templateId.replace(/^tpl_/, '').replace(/_/g, ' ')}
                  </p>
                  <p className="truncate font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                    on {r.datasetId}
                  </p>
                </div>
                <span className="font-tag text-foreground/55">{STATUS_LABEL[r.status]}</span>
                <span className="font-mono text-[0.72rem] tabular-nums text-muted-foreground">
                  {r.durationMs ? fmtDuration(r.durationMs) : '—'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="hidden font-mono text-[0.72rem] tabular-nums text-muted-foreground md:inline">
                    {fmtRelativeTime(r.queuedAt)}
                  </span>
                  <AttestationBadge attestation={r.attestation ?? null} compact />
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
