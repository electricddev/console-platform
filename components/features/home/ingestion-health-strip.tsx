import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct, fmtDuration } from '@/lib/format'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Source } from '@/lib/api/types'

const TONE: Record<Source['status'], string> = {
  healthy: 'bg-success/15 text-success border-success/30',
  lagging: 'bg-warning/15 text-warning border-warning/30',
  paused: 'bg-muted text-muted-foreground border-border',
  down: 'bg-destructive/15 text-destructive border-destructive/30',
}

export function IngestionHealthStrip({ sources }: { sources: Source[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Ingestion health</CardTitle>
        <Link href="/sources" className="text-xs text-muted-foreground hover:text-foreground">
          View sources →
        </Link>
      </CardHeader>
      <CardContent className="grid gap-2">
        {sources.map((s) => (
          <Link
            key={s.id}
            href={`/sources/${s.id}`}
            className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-md border border-border/70 bg-surface/50 px-3 py-2 hover:bg-surface"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {fmtNumber(s.recordsProcessed)} records · lag {fmtDuration(s.lagSeconds * 1000)}
              </p>
            </div>
            <span className="tabular-nums text-xs text-muted-foreground">{fmtPct(s.completenessPct)}</span>
            <FreshnessIndicator timestamp={s.lastCommitAt} />
            <Badge variant="outline" className={TONE[s.status]}>
              {s.status}
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  )
}
