import { fmtNumber } from '@/lib/format'
import { MetricCard } from './metric-card'
import { InsightCard } from './insight-card'
import { RecentRunsStrip } from './recent-runs-strip'
import { WatchedDatasets } from './watched-datasets'
import { PendingTasks } from './pending-tasks'
import type { Dataset, Run, AIInsight } from '@/lib/api/types'

type Props = {
  userName: string
  watched: Dataset[]
  recentRuns: Run[]
  insights: AIInsight[]
  pending: { id: string; title: string; href: string; kind: string }[]
}

export function CounterpartyHome({ watched, recentRuns, insights, pending }: Props) {
  const monitored = watched.length
  const now = new Date().getTime()
  const openQueriesThisWeek = recentRuns.filter(
    (r) => now - new Date(r.queuedAt).getTime() < 7 * 86_400_000
  ).length
  const attestationsReceived = recentRuns.filter((r) => r.attestation).length
  const anomalies = insights.filter((i) => i.severity !== 'info').length

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Monitored datasets" value={fmtNumber(monitored)} freshAt={null} />
        <MetricCard
          label="Queries this week"
          value={fmtNumber(openQueriesThisWeek)}
          delta={{ direction: 'up', label: 'vs last week' }}
        />
        <MetricCard label="Attestations received" value={fmtNumber(attestationsReceived)} />
        <MetricCard
          label="Anomalies detected"
          value={fmtNumber(anomalies)}
          delta={anomalies > 0 ? { direction: 'up', label: 'review' } : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="grid gap-3 lg:col-span-2">
          <h2 className="font-tag text-foreground/60">{'// ai insights'}</h2>
          {insights.slice(0, 3).map((i) => (
            <InsightCard key={i.id} insight={i} />
          ))}
        </div>
        <PendingTasks tasks={pending} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <RecentRunsStrip runs={recentRuns.slice(0, 8)} />
        <WatchedDatasets datasets={watched} />
      </div>
    </section>
  )
}
