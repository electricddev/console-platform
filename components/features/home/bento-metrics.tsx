import { TrendingUp, TrendingDown, Minus, AlertTriangle, Database, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MiniBarChart } from './mini-bar-chart'
import { DonutChart } from './donut-chart'
import { Sparkline } from './sparkline'
import { CornerMarks } from './corner-marks'

type Severity = 'info' | 'warning' | 'critical'

type Props = {
  monitored: number
  monitoredSeries: number[]
  queriesThisWeek: number
  queriesLastWeek: number
  queriesDailySeries: number[]
  queriesDayLabels: string[]
  attestationsReceived: number
  attestationCoveragePct: number
  attestationSeries: number[]
  anomalies: number
  anomaliesBySeverity: { severity: Severity; count: number }[]
  className?: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function pctChange(next: number, prev: number): number {
  if (prev === 0) return 0
  return Math.round(((next - prev) / prev) * 100)
}

function formatLargeNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toString()
}

const severityToneClass: Record<Severity, string> = {
  critical: 'text-destructive',
  warning: 'text-warning',
  info: 'text-info',
}

const severityLabel: Record<Severity, string> = {
  critical: 'Critical',
  warning: 'Warning',
  info: 'Info',
}

// ─── Delta chip ───────────────────────────────────────────────────────────────

type DeltaChipProps = {
  pct: number
  /** When true, negative deltas are styled as positive (e.g. fewer anomalies = good). */
  invertSentiment?: boolean
}

function DeltaChip({ pct, invertSentiment = false }: DeltaChipProps) {
  const isFlat = pct === 0
  const isUp = pct > 0
  const isPositive = invertSentiment ? !isUp : isUp

  const tone = isFlat
    ? 'text-muted-foreground bg-muted'
    : isPositive
      ? 'text-success bg-success/10'
      : 'text-destructive bg-destructive/10'

  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown
  const sign = pct > 0 ? '+' : ''

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[0.65rem] tabular-nums leading-none',
        tone,
      )}
    >
      <Icon size={9} strokeWidth={1.75} aria-hidden />
      {sign}{pct}% vs prev
    </span>
  )
}

// ─── Tile A — Queries (hero) ───────────────────────────────────────────────────

type TileAProps = Pick<
  Props,
  'queriesThisWeek' | 'queriesLastWeek' | 'queriesDailySeries' | 'queriesDayLabels'
>

function TileQueries({ queriesThisWeek, queriesLastWeek, queriesDailySeries, queriesDayLabels }: TileAProps) {
  const delta = pctChange(queriesThisWeek, queriesLastWeek)

  return (
    <article
      className={cn(
        'surface-glass ring-accent-soft relative col-span-1 row-span-1 flex flex-col gap-0 overflow-hidden',
        'rounded-md border border-border p-6',
        'transition-all hover:border-accent/40',
        'md:col-span-2 md:row-span-2',
        'lg:col-span-3 lg:row-span-2',
      )}
      aria-label="Queries this week"
    >
      {/* decorative halo */}
      <div aria-hidden className="accent-halo pointer-events-none absolute inset-0" />

      {/* corner marks — architectural framing */}
      <CornerMarks tone="accent" size={8} inset={-3} />

      {/* header row */}
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="font-tag text-foreground/55">Queries · 7 days</p>
          {/* live dot */}
          <span
            aria-label="Live data"
            className="pulse-soft inline-block size-2 rounded-full bg-success"
          />
        </div>
        <DeltaChip pct={delta} />
      </div>

      {/* main number */}
      <div className="relative z-10 mt-4 flex items-baseline gap-3">
        <p className="font-mono text-[2.6rem] font-medium tabular-nums leading-none tracking-tight text-foreground">
          {formatLargeNumber(queriesThisWeek)}
        </p>
        <span className="font-mono text-sm text-muted-foreground tabular-nums">
          this week
        </span>
      </div>

      {/* vs last week caption */}
      <p className="relative z-10 mt-1.5 font-mono text-[0.7rem] tabular-nums text-muted-foreground">
        prev week {formatLargeNumber(queriesLastWeek)}
      </p>

      {/* bar chart — pushed to bottom */}
      <div className="relative z-10 mt-auto pt-6">
        <MiniBarChart
          values={queriesDailySeries}
          labels={queriesDayLabels}
          highlightLast
          height={56}
          className="w-full"
        />
      </div>
    </article>
  )
}

// ─── Tile B — Anomalies ────────────────────────────────────────────────────────

type TileBProps = Pick<Props, 'anomalies' | 'anomaliesBySeverity'>

function TileAnomalies({ anomalies, anomaliesBySeverity }: TileBProps) {
  const hasAnomalies = anomalies > 0

  const filteredSlices = anomaliesBySeverity
    .filter((s) => s.count > 0)
    .map((s) => ({
      label: severityLabel[s.severity],
      value: s.count,
      toneClass: severityToneClass[s.severity],
    }))

  // If all zero, show a neutral placeholder slice so the donut isn't empty
  const donutSlices =
    filteredSlices.length > 0
      ? filteredSlices
      : [{ label: 'None', value: 1, toneClass: 'text-foreground/15' }]

  return (
    <article
      className={cn(
        'relative col-span-1 row-span-1 flex flex-col overflow-hidden rounded-md border bg-surface p-6',
        'transition-all hover:bg-muted/30',
        hasAnomalies
          ? 'border-l-2 border-warning/40 border-t-border border-r-border border-b-border'
          : 'border-border',
        'lg:col-span-3 lg:row-span-1',
      )}
      aria-label="Anomalies"
    >
      <div className="flex items-start justify-between gap-4">
        {/* left: number + heading */}
        <div className="flex flex-col gap-1">
          <p className="font-tag text-foreground/55">Anomalies</p>
          <p
            className={cn(
              'font-mono text-3xl font-medium tabular-nums leading-none tracking-tight',
              hasAnomalies ? 'text-warning' : 'text-foreground',
            )}
          >
            {anomalies}
          </p>
          <span className="text-[0.72rem] text-muted-foreground">
            {hasAnomalies ? 'requires review' : 'all clear'}
          </span>
        </div>

        {/* right: donut + legend */}
        <div className="flex items-center gap-3">
          <DonutChart
            slices={donutSlices}
            size={72}
            thickness={7}
            centerValue={anomalies > 0 ? anomalies.toString() : '0'}
            centerLabel="total"
          />

          {/* legend — only show when there are actual anomalies */}
          {filteredSlices.length > 0 && (
            <ul className="flex flex-col gap-1.5" aria-label="Anomaly breakdown">
              {filteredSlices.map((s) => (
                <li key={s.label} className="flex items-center gap-1.5">
                  <span
                    className={cn('inline-block size-1.5 rounded-full bg-current', s.toneClass)}
                    aria-hidden
                  />
                  <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
                    {s.value} {s.label.toLowerCase()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* warning icon badge when active */}
      {hasAnomalies && (
        <div className="pointer-events-none absolute right-4 top-4">
          <AlertTriangle
            size={14}
            strokeWidth={1.75}
            className="text-warning/50"
            aria-hidden
          />
        </div>
      )}
    </article>
  )
}

// ─── Tile C — Monitored datasets ──────────────────────────────────────────────

type TileCProps = Pick<Props, 'monitored' | 'monitoredSeries'>

function TileMonitored({ monitored, monitoredSeries }: TileCProps) {
  const last = monitoredSeries[monitoredSeries.length - 1] ?? monitored
  const prev = monitoredSeries[monitoredSeries.length - 2] ?? last
  const trend = last >= prev ? 'positive' : 'neutral'

  return (
    <article
      className={cn(
        'relative col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-md border border-border bg-surface p-6',
        'transition-all hover:bg-muted/30',
        'lg:col-span-2 lg:row-span-1',
      )}
      aria-label="Monitored datasets"
    >
      {/* dot patch decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-16 w-20 bg-dot-fine mask-radial-tr opacity-60"
      />

      <CornerMarks tone="subtle" size={7} inset={-3} corners={['tr']} />

      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <Database size={11} strokeWidth={1.75} className="text-foreground/40" aria-hidden />
          <p className="font-tag text-foreground/55">Monitored</p>
        </div>
        <p className="font-mono text-3xl font-medium tabular-nums leading-none tracking-tight">
          {monitored}
        </p>
        <span className="text-[0.72rem] text-muted-foreground">datasets</span>
      </div>

      <div className="relative z-10 mt-3">
        <Sparkline
          values={monitoredSeries.length > 1 ? monitoredSeries : [0, monitored]}
          tone={trend}
          width={110}
          height={28}
        />
      </div>
    </article>
  )
}

// ─── Tile D — Attestations ────────────────────────────────────────────────────

type TileDProps = Pick<Props, 'attestationsReceived' | 'attestationCoveragePct' | 'attestationSeries'>

function TileAttestations({ attestationsReceived, attestationCoveragePct, attestationSeries }: TileDProps) {
  const coveragePct = Math.min(100, Math.max(0, Math.round(attestationCoveragePct * 100)))
  const isHealthy = coveragePct >= 80

  return (
    <article
      className={cn(
        'relative col-span-1 row-span-1 flex flex-col justify-between overflow-hidden rounded-md border border-border bg-surface p-6',
        'transition-all hover:bg-muted/30',
        'lg:col-span-1 lg:row-span-1',
      )}
      aria-label="Attestations"
    >
      <div className="relative z-10 flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={11} strokeWidth={1.75} className="text-foreground/40" aria-hidden />
          <p className="font-tag text-foreground/55">Attestations</p>
        </div>
        <p className="font-mono text-3xl font-medium tabular-nums leading-none tracking-tight">
          {attestationsReceived}
        </p>
        <span className="text-[0.72rem] text-muted-foreground">received</span>
      </div>

      {/* coverage progress bar */}
      <div className="relative z-10 mt-4 flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="font-tag text-foreground/55">Coverage</span>
          <span
            className={cn(
              'font-mono text-[0.7rem] tabular-nums',
              isHealthy ? 'text-success' : 'text-warning',
            )}
          >
            {coveragePct}%
          </span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={coveragePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Attestation coverage ${coveragePct}%`}
        >
          <div
            className={cn(
              'h-full rounded-full transition-all',
              isHealthy ? 'bg-success' : 'bg-warning',
            )}
            style={{ width: `${coveragePct}%` }}
          />
        </div>
        {/* sparkline trend for attestations */}
        {attestationSeries.length > 1 && (
          <Sparkline
            values={attestationSeries}
            tone={isHealthy ? 'positive' : 'neutral'}
            width={96}
            height={20}
            className="mt-1 opacity-70"
          />
        )}
      </div>
    </article>
  )
}

// ─── BentoMetrics (root) ──────────────────────────────────────────────────────

export function BentoMetrics({
  monitored,
  monitoredSeries,
  queriesThisWeek,
  queriesLastWeek,
  queriesDailySeries,
  queriesDayLabels,
  attestationsReceived,
  attestationCoveragePct,
  attestationSeries,
  anomalies,
  anomaliesBySeverity,
  className,
}: Props) {
  return (
    <section
      aria-label="Key metrics"
      className={cn(
        'grid grid-cols-1 gap-3',
        'md:grid-cols-2',
        'lg:grid-cols-6',
        className,
      )}
    >
      <TileQueries
        queriesThisWeek={queriesThisWeek}
        queriesLastWeek={queriesLastWeek}
        queriesDailySeries={queriesDailySeries}
        queriesDayLabels={queriesDayLabels}
      />
      <TileAnomalies
        anomalies={anomalies}
        anomaliesBySeverity={anomaliesBySeverity}
      />
      <TileMonitored
        monitored={monitored}
        monitoredSeries={monitoredSeries}
      />
      <TileAttestations
        attestationsReceived={attestationsReceived}
        attestationCoveragePct={attestationCoveragePct}
        attestationSeries={attestationSeries}
      />
    </section>
  )
}
