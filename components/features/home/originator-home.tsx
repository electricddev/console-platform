import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct } from '@/lib/format'
import { MetricCard } from '@/components/features/home/metric-card'
import { IngestionHealthStrip } from './ingestion-health-strip'
import { CounterpartyActivity } from './counterparty-activity'
import type { Source, ApprovalRequest, Run } from '@/lib/api/types'

type Props = {
  sources: Source[]
  pendingApprovals: ApprovalRequest[]
  recentRuns: Run[]
}

export function OriginatorHome({ sources, pendingApprovals, recentRuns }: Props) {
  const overall =
    sources.length === 0
      ? 1
      : sources.reduce((a, s) => a + s.completenessPct, 0) / sources.length
  const lagging = sources.filter((s) => s.status === 'lagging' || s.status === 'down').length

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sources" value={fmtNumber(sources.length)} />
        <MetricCard
          label="Avg completeness 24h"
          value={fmtPct(overall)}
        />
        <MetricCard
          label="Pending approvals"
          value={fmtNumber(pendingApprovals.length)}
          delta={pendingApprovals.length > 0 ? { direction: 'up', label: 'review' } : undefined}
        />
        <MetricCard
          label="Lagging sources"
          value={fmtNumber(lagging)}
          delta={lagging > 0 ? { direction: 'up', label: 'investigate' } : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <IngestionHealthStrip sources={sources} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pending approvals</CardTitle>
            <Link
              href="/approvals"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all →
            </Link>
          </CardHeader>
          <CardContent className="grid divide-y divide-border/60 px-0">
            {pendingApprovals.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                No pending approvals.
              </p>
            ) : (
              pendingApprovals.map((a) => (
                <Link
                  key={a.id}
                  href={`/approvals/${a.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.templateId}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      on {a.datasetId} · from {a.requesterOrgId}
                    </p>
                  </div>
                  {a.urgency === 'high' ? (
                    <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">
                      urgent
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{a.state}</span>
                  )}
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <CounterpartyActivity runs={recentRuns.slice(0, 10)} />
    </section>
  )
}
