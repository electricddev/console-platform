import { fmtNumber } from '@/lib/format'
import { HomeHero } from './home-hero'
import { BentoMetrics } from './bento-metrics'
import { FeaturedInsight } from './featured-insight'
import { InsightRow } from './insight-row'
import { LiveStream, type StreamEvent, type StreamEventKind } from './live-stream'
import { WatchlistCockpit } from './watchlist-cockpit'
import { ActivityHeatmap } from './activity-heatmap'
import { TrustLedger } from './trust-ledger'
import { PendingTasks } from './pending-tasks'
import type { Dataset, Run, AIInsight } from '@/lib/api/types'

type Props = {
  userName: string
  orgName: string
  watched: Dataset[]
  recentRuns: Run[]
  insights: AIInsight[]
  pending: { id: string; title: string; href: string; kind: string }[]
}

const SEVERITY_RANK = { critical: 3, warning: 2, info: 1 } as const
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Bucket runs into 7 daily buckets ending today. */
function weekBuckets(
  runs: Run[],
  now: number,
  predicate: (r: Run) => boolean = () => true,
): number[] {
  const buckets = new Array(7).fill(0) as number[]
  for (const r of runs) {
    if (!predicate(r)) continue
    const ageDays = Math.floor((now - new Date(r.queuedAt).getTime()) / 86_400_000)
    if (ageDays >= 0 && ageDays < 7) buckets[6 - ageDays] += 1
  }
  return buckets
}

/** Map weekday labels so the rightmost bar is "today". */
function rotatingDayLabels(now: number): string[] {
  const today = new Date(now).getDay() // 0=Sun ... 6=Sat
  // We want array of length 7, rightmost is today, going back through the week.
  const result: string[] = []
  for (let i = 6; i >= 0; i--) {
    const dayIndex = (today - i + 7) % 7
    // map 0=Sun → DAY_LABELS index 6, 1=Mon → 0, etc.
    const labelIdx = dayIndex === 0 ? 6 : dayIndex - 1
    result.push(DAY_LABELS[labelIdx])
  }
  return result
}

/** Build a synthetic Live stream from runs + insights. */
function buildStream(runs: Run[], insights: AIInsight[]): StreamEvent[] {
  const events: StreamEvent[] = []

  for (const r of runs) {
    let kind: StreamEventKind
    let title: string
    if (r.status === 'failed') {
      kind = 'run-failed'
      title = `${r.templateId.replace(/^tpl_/, '').replace(/_/g, ' ')} failed`
    } else if (r.attestation?.anchorTxHash) {
      kind = 'anchored'
      title = `Run anchored on ${r.attestation.anchorChain ?? 'chain'}`
    } else if (r.attestation) {
      kind = 'attestation'
      title = `${r.templateId.replace(/^tpl_/, '').replace(/_/g, ' ')} attested`
    } else if (r.status === 'running' || r.status === 'queued' || r.status === 'attesting' || r.status === 'anchoring') {
      kind = 'run-started'
      title = `${r.templateId.replace(/^tpl_/, '').replace(/_/g, ' ')} ${r.status}`
    } else {
      kind = 'run-completed'
      title = `${r.templateId.replace(/^tpl_/, '').replace(/_/g, ' ')} completed`
    }

    const anchorChain = r.attestation?.anchorChain
    const subtitle =
      kind === 'anchored' && r.attestation?.anchorTxHash
        ? `tx ${r.attestation.anchorTxHash.slice(0, 6)}…${r.attestation.anchorTxHash.slice(-4)} · ${anchorChain ?? 'chain'}${r.attestation.anchorBlockNumber ? ` · block ${r.attestation.anchorBlockNumber}` : ''}`
        : `on ${r.datasetId}${r.durationMs ? ` · ${(r.durationMs / 1000).toFixed(1)}s` : ''}`

    events.push({
      id: r.id,
      kind,
      title,
      subtitle,
      href: `/runs/${r.id}`,
      timestamp: r.queuedAt,
    })
  }

  for (const i of insights) {
    if (i.severity === 'info') continue
    events.push({
      id: i.id,
      kind: 'anomaly',
      title: i.claim,
      subtitle: `evidence · ${i.evidenceRunIds.slice(0, 2).join(', ')}`,
      href: i.suggestedAction?.href,
      timestamp: i.generatedAt,
    })
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  if (events.length > 0) events[0].highlight = true
  return events.slice(0, 6)
}

export function CounterpartyHome({
  userName,
  orgName,
  watched,
  recentRuns,
  insights,
  pending,
}: Props) {
  const monitored = watched.length
  const now = new Date().getTime()

  const queriesThisWeek = recentRuns.filter(
    (r) => now - new Date(r.queuedAt).getTime() < 7 * 86_400_000,
  ).length
  const queriesLastWeek = recentRuns.filter((r) => {
    const age = now - new Date(r.queuedAt).getTime()
    return age >= 7 * 86_400_000 && age < 14 * 86_400_000
  }).length

  const attestationsReceived = recentRuns.filter((r) => r.attestation).length
  const attestationCoverage =
    recentRuns.length > 0 ? attestationsReceived / recentRuns.length : 1

  const liveInsights = insights.filter((i) => !i.id.startsWith('ins_dismissed_'))
  const anomalies = liveInsights.filter((i) => i.severity !== 'info').length
  const anomaliesBySeverity = (['critical', 'warning', 'info'] as const).map((s) => ({
    severity: s,
    count: liveInsights.filter((i) => i.severity === s).length,
  }))

  const queriesDailySeries = weekBuckets(recentRuns, now)
  const attestationSeries = weekBuckets(recentRuns, now, (r) => Boolean(r.attestation))
  const monitoredSeries = (() => {
    const base = monitored
    if (base === 0) return [0, 0, 0, 0, 0, 0, 0]
    return [
      Math.max(0, base - 2),
      Math.max(0, base - 1),
      Math.max(0, base - 1),
      base,
      base,
      base,
      base,
    ]
  })()

  const featured = [...liveInsights].sort(
    (a, b) =>
      SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
      new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  )[0]
  const remainingInsights = featured
    ? liveInsights.filter((i) => i.id !== featured.id).slice(0, 4)
    : liveInsights.slice(0, 4)

  const newRunsCount = recentRuns.filter(
    (r) => now - new Date(r.queuedAt).getTime() < 24 * 3_600_000,
  ).length
  const lastEvent =
    recentRuns
      .map((r) => r.queuedAt)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null

  const stream = buildStream(recentRuns, liveInsights)

  // Quick-action chips for the hero command prompt — context-aware.
  const suggestions = [
    {
      id: 's1',
      label: 'Compare default rates',
      href: '/copilot?seed=compare-default-rates',
      tone: 'accent' as const,
    },
    ...(featured
      ? [{ id: 's2', label: `Investigate ${featured.id.replace(/^ins_/, '#')}`, href: '/copilot?seed=' + featured.id }]
      : []),
    { id: 's3', label: 'Weekly digest', href: '/copilot?seed=weekly-digest' },
    { id: 's4', label: 'Open last notebook', href: '/notebooks' },
  ]

  return (
    <div className="grid">
      <HomeHero
        userName={userName}
        orgName={orgName}
        newRuns={newRunsCount}
        newInsights={liveInsights.length}
        lastEventAt={lastEvent}
        suggestions={suggestions}
      />

      <section className="px-6 pt-8 pb-12 md:px-10 md:pt-10 md:pb-16">
        <BentoMetrics
          monitored={monitored}
          monitoredSeries={monitoredSeries}
          queriesThisWeek={queriesThisWeek}
          queriesLastWeek={queriesLastWeek}
          queriesDailySeries={queriesDailySeries}
          queriesDayLabels={rotatingDayLabels(now)}
          attestationsReceived={attestationsReceived}
          attestationCoveragePct={attestationCoverage}
          attestationSeries={attestationSeries}
          anomalies={anomalies}
          anomaliesBySeverity={anomaliesBySeverity}
        />

        <div className="mt-16 grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="grid gap-8 lg:col-span-7">
            <div className="grid gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-3xl tracking-tight">
                  What the room is telling you
                </h2>
                <span className="font-tag text-foreground/55">{'// ai · copilot'}</span>
              </div>
              <p className="max-w-[60ch] text-sm text-muted-foreground">
                Surfaced from {fmtNumber(recentRuns.length)} recent runs across your watchlist.
                Every claim links to its evidence and on-chain attestation.
              </p>
            </div>

            {featured ? (
              <FeaturedInsight insight={featured} />
            ) : (
              <div className="border border-dashed border-border bg-surface p-6 md:p-8">
                <p className="font-display text-xl italic text-foreground/70">
                  No anomalies surfaced.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The Copilot is watching {fmtNumber(monitored)} datasets continuously.
                </p>
              </div>
            )}

            {remainingInsights.length > 0 && (
              <div className="grid">
                <h3 className="mb-1 font-tag text-foreground/55">{'// also flagged'}</h3>
                <div className="grid">
                  {remainingInsights.map((i) => (
                    <InsightRow key={i.id} insight={i} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="grid gap-10 lg:col-span-5">
            <LiveStream events={stream} viewAllHref="/runs" />
            <PendingTasks tasks={pending} />
          </aside>
        </div>

        <div className="mt-16">
          <WatchlistCockpit datasets={watched} now={now} />
        </div>

        <div className="mt-16">
          <ActivityHeatmap runs={recentRuns} now={now} />
        </div>

        <div className="mt-16">
          <TrustLedger runs={recentRuns} now={now} limit={10} />
        </div>
      </section>
    </div>
  )
}
