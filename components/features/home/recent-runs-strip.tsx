import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtDuration, fmtRelativeTime } from '@/lib/format'
import { AttestationBadge } from '@/components/common/attestation-badge'
import type { Run } from '@/lib/api/types'

const STATUS_TONE: Record<Run['status'], string> = {
  queued: 'bg-muted text-muted-foreground',
  running: 'bg-info/15 text-info',
  attesting: 'bg-info/15 text-info',
  anchoring: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  failed: 'bg-destructive/15 text-destructive',
  disputed: 'bg-warning/15 text-warning',
}

export function RecentRunsStrip({ runs }: { runs: Run[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Recent runs</CardTitle>
        <Link href="/runs" className="text-xs text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </CardHeader>
      <CardContent className="grid divide-y divide-border/60 px-0">
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">No runs yet.</p>
        ) : (
          runs.map((r) => (
            <Link
              key={r.id}
              href={`/runs/${r.id}`}
              className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2 hover:bg-muted/40"
            >
              <Badge variant="outline" className={STATUS_TONE[r.status]}>
                {r.status}
              </Badge>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.templateId}</p>
                <p className="truncate text-xs text-muted-foreground">
                  on <span className="font-mono">{r.datasetId}</span>
                </p>
              </div>
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {r.durationMs ? fmtDuration(r.durationMs) : '—'}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</span>
                <AttestationBadge attestation={r.attestation ?? null} compact />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  )
}
