import React from 'react'
import Link from 'next/link'
import { ArrowRight, AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react'
import type { Dataset, Attestation } from '@/lib/api/types'
import { Sparkline } from './sparkline'
import { fmtNumber, fmtPct, fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

// ─── helpers ────────────────────────────────────────────────────────────────

/** Tiny deterministic hash (djb2) → integer in [0, 1) */
function seededRand(seed: string, index: number): number {
  let h = 5381
  const s = seed + String(index)
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i)
    h = h >>> 0
  }
  return h / 0xffffffff
}

/** Generate 7 synthetic record-growth points from a seed, trending upward. */
function syntheticGrowthSeries(id: string, base: number): number[] {
  const series: number[] = []
  let v = base * (0.88 + seededRand(id, 99) * 0.08)
  for (let i = 0; i < 7; i++) {
    const delta = (seededRand(id, i) - 0.3) * base * 0.04
    v = Math.max(0, v + delta + base * 0.01)
    series.push(Math.round(v))
  }
  return series
}

/** Synthetic 7d completeness delta in pp, deterministic from id. */
function syntheticCompletenessDelta(id: string): number {
  return (seededRand(id, 42) - 0.5) * 3 // ±1.5pp
}

/** 7d sparkline growth % between first and last point. */
function seriesDelta(series: number[]): number {
  if (series.length < 2 || series[0] === 0) return 0
  return ((series[series.length - 1] - series[0]) / series[0]) * 100
}

/** Freshness score 0..1 — newer = higher. Pure: takes now as a parameter. */
function freshnessFraction(iso: string, now: number): number {
  const ageMs = now - new Date(iso).getTime()
  const WEEK_MS = 7 * 24 * 3_600_000
  return Math.max(0, 1 - ageMs / WEEK_MS)
}

/** Risk score 0..100 */
function riskScore(d: Dataset, now: number): number {
  const completeness = d.completenessPct
  const freshness = freshnessFraction(d.lastAttestedAt, now)
  const noAlerts = d.alerts.length === 0 ? 15 : 0
  const raw = completeness * 60 + freshness * 25 + noAlerts
  return Math.round(Math.min(100, Math.max(0, raw)))
}

/** Human-readable label for a 0..100 risk score */
function riskLabel(score: number): 'trust' | 'fair' | 'watch' | 'flag' {
  if (score >= 85) return 'trust'
  if (score >= 70) return 'fair'
  if (score >= 50) return 'watch'
  return 'flag'
}

/** Tailwind tone classes for a given 0..100 risk score */
function scoreTone(score: number): { text: string; stroke: string } {
  if (score >= 85) return { text: 'text-success', stroke: 'stroke-success' }
  if (score >= 70) return { text: 'text-accent', stroke: 'stroke-accent' }
  if (score >= 50) return { text: 'text-warning', stroke: 'stroke-warning' }
  return { text: 'text-destructive', stroke: 'stroke-destructive' }
}

/** SVG arc path for a donut arc from 0 to `fraction` (0..1). Starts at top. */
function arcPath(cx: number, cy: number, r: number, fraction: number): string {
  if (fraction <= 0) return ''
  if (fraction >= 1) fraction = 0.9999
  const startAngle = -Math.PI / 2
  const endAngle = startAngle + fraction * 2 * Math.PI
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(endAngle)
  const y2 = cy + r * Math.sin(endAngle)
  const largeArc = fraction > 0.5 ? 1 : 0
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`
}

const ASSET_LABEL: Record<string, string> = {
  'private-credit': 'Private credit',
  'trade-receivables': 'Trade receivables',
  'flow-credit': 'Flow credit',
  't-bills': 'T-bills',
  'multi-asset': 'Multi-asset',
  // graceful fallbacks for spec values
  'public-equity': 'Public equity',
  'real-estate': 'Real estate',
  'private-equity': 'Private equity',
  treasuries: 'Treasuries',
  commodities: 'Commodities',
  fx: 'FX',
  crypto: 'Crypto',
}

function toAssetLabel(assetClass: string): string {
  return ASSET_LABEL[assetClass] ?? assetClass.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── sub-components (inline, server-safe) ───────────────────────────────────

type RiskGaugeProps = { score: number }

function RiskGauge({ score }: RiskGaugeProps) {
  const tone = scoreTone(score)
  const fraction = score / 100
  const CX = 20
  const CY = 20
  const R = 14
  const path = arcPath(CX, CY, R, fraction)

  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 40 40"
      aria-label={`Trust score ${score}`}
      role="img"
    >
      {/* Track */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        className="stroke-border"
        strokeWidth={3}
      />
      {/* Arc */}
      {path && (
        <path
          d={path}
          fill="none"
          className={tone.stroke}
          strokeWidth={3}
          strokeLinecap="round"
        />
      )}
      {/* Label — style-only fontSize to avoid class/style conflict */}
      <text
        x={CX}
        y={CY + 3}
        textAnchor="middle"
        className={cn('fill-current font-mono font-medium tabular-nums', tone.text)}
        style={{ fontSize: '9px', fontFamily: 'inherit' }}
      >
        {score}
      </text>
    </svg>
  )
}

// Non-interactive attestation chip — a plain <span>, no button/popover,
// safe to render inside a <Link> (<a>) without invalid nesting.
type AttestationChipProps = { attestation: Attestation | null }

function AttestationChip({ attestation }: AttestationChipProps) {
  if (!attestation) {
    return (
      <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/5 px-1.5 py-0.5 text-[0.7rem] font-medium text-warning">
        <ShieldAlert className="size-3" strokeWidth={1.75} />
        <span className="sr-only">Unattested</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[0.7rem] font-medium text-success">
      <ShieldCheck className="size-3" strokeWidth={1.75} />
      <span className="sr-only">Verified</span>
    </span>
  )
}

// ColHeaders — only shown at lg+, where the multi-column grid layout is active.
// Below lg, each row carries inline labels so headers would be redundant.
function ColHeaders() {
  return (
    <div
      aria-hidden
      className="hidden grid-cols-12 items-baseline gap-x-4 pb-2 font-tag text-[0.65rem] text-foreground/70 lg:grid"
    >
      <div className="col-span-4">Dataset</div>
      <div className="col-span-2 text-right">Records</div>
      <div className="col-span-2 text-right">Completeness</div>
      <div className="col-span-1 text-center">Trust</div>
      <div className="col-span-2 text-right">Last anchor</div>
      <div className="col-span-1" />
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

type Props = {
  datasets: Dataset[]
  now: number
  className?: string
}

export function WatchlistCockpit({ datasets, now, className }: Props): React.ReactElement {
  const assetClassCount = new Set(datasets.map((d) => d.assetClass)).size
  const topId = datasets.length > 0
    ? datasets.reduce((best, d) => riskScore(d, now) > riskScore(best, now) ? d : best).id
    : null

  // Footer summary stats
  const avgCompleteness = datasets.length > 0
    ? datasets.reduce((acc, d) => acc + d.completenessPct, 0) / datasets.length
    : 0
  const totalRecords = datasets.reduce((acc, d) => acc + d.recordCount, 0)
  const totalTemplates = datasets.reduce((acc, d) => acc + d.templateCount, 0)
  const attestedLast24h = datasets.filter(
    (d) => now - new Date(d.lastAttestedAt).getTime() < 86_400_000
  ).length

  return (
    <section
      aria-labelledby="watchlist-cockpit-title"
      className={cn('relative rounded-md border border-border bg-surface p-6 md:p-8', className)}
    >
      <div>
        {/* ── Header ── */}
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
          <h2
            id="watchlist-cockpit-title"
            className="font-display text-2xl tracking-tight text-foreground"
          >
            Watchlist cockpit
          </h2>
          <div className="flex items-center gap-4">
            <span className="font-tag text-foreground/55">
              <span aria-hidden>{'// '}</span>
              {datasets.length} dataset{datasets.length !== 1 ? 's' : ''}{' · '}
              {assetClassCount} asset class{assetClassCount !== 1 ? 'es' : ''}
            </span>
            <Link
              href="/datasets"
              className="font-tag text-foreground/55 transition-colors hover:text-foreground"
            >
              <span aria-hidden>{'// '}</span>browse all<span aria-hidden>{' →'}</span>
            </Link>
          </div>
        </header>

        {/* ── Empty state ── */}
        {datasets.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-display text-base italic text-muted-foreground">
              No datasets in your watchlist yet.
            </p>
            <Link
              href="/datasets"
              className="mt-3 inline-flex items-center gap-1.5 font-tag text-foreground/55 transition-colors hover:text-foreground"
            >
              Browse datasets <ArrowRight className="size-3" strokeWidth={1.75} />
            </Link>
          </div>
        ) : (
          <>
            <ColHeaders />

            {/* ── Rows ──
                Below lg, rows stack: dataset header on top, then a 2/4-col grid
                of metrics with inline labels. At lg+, `lg:contents` flattens the
                metrics wrapper so its children become direct grid items in the
                row's 12-col layout (4-2-2-1-2-1). */}
            <ul className="flex flex-col divide-y divide-border/70">
              {datasets.map((d) => {
                const isTop = d.id === topId
                const score = riskScore(d, now)
                const label = riskLabel(score)
                const tone = scoreTone(score)
                const series = syntheticGrowthSeries(d.id, d.recordCount)
                const growth = seriesDelta(series)
                const completeDelta = syntheticCompletenessDelta(d.id)
                const completePct = Math.max(0, Math.min(1, d.completenessPct))
                const completeTone =
                  completePct >= 0.97
                    ? 'bg-success'
                    : completePct >= 0.85
                      ? 'bg-foreground/70'
                      : 'bg-warning'

                const ariaLabel = `${d.name}, ${toAssetLabel(d.assetClass)}, ${fmtNumber(d.recordCount)} records, ${fmtPct(completePct)} complete, trust score ${score} (${label}), last attested ${fmtRelativeTime(d.lastAttestedAt)}, ${d.attestation ? 'verified' : 'unattested'}${d.alerts.length > 0 ? `, ${d.alerts.length} alert${d.alerts.length === 1 ? '' : 's'}` : ''}${isTop ? ', top ranked' : ''}`

                return (
                  <li key={d.id}>
                    <Link
                      href={`/datasets/${d.id}`}
                      aria-label={ariaLabel}
                      className={cn(
                        'group relative flex flex-col gap-3 rounded-md py-3 transition-colors hover:bg-muted/30',
                        'lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-4 lg:gap-y-1 lg:rounded-none lg:active:translate-y-px',
                        isTop &&
                          'bg-accent/5 ring-1 ring-inset ring-accent/20 lg:rounded-md lg:px-3'
                      )}
                    >
                      {/* ── Dataset cell ── */}
                      <div className="flex min-w-0 flex-col gap-0.5 lg:col-span-4 lg:pr-2">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            aria-label={`Status: ${d.status}`}
                            className={cn(
                              'size-1.5 shrink-0 rounded-full',
                              d.status === 'active' && 'bg-success pulse-soft',
                              d.status === 'paused' && 'bg-warning',
                              d.status === 'archived' && 'bg-foreground/30'
                            )}
                          />
                          <span className="truncate text-[0.95rem] font-medium text-foreground">
                            {d.name}
                          </span>
                          {isTop && (
                            <>
                              <span aria-hidden className="font-tag text-foreground/30">·</span>
                              <span aria-hidden className="font-tag text-accent/80 shrink-0"><span aria-hidden>{'// '}</span>top-ranked</span>
                            </>
                          )}
                        </div>

                        {/* Sub-row: asset class + alerts */}
                        <div className="flex items-center gap-1.5">
                          <span className="font-tag text-foreground/55">
                            {toAssetLabel(d.assetClass)}
                          </span>
                          {d.alerts.length > 0 && (
                            <span className="flex items-center gap-0.5">
                              <AlertTriangle
                                className="size-2.5 text-warning"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                              <span
                                className="font-mono text-[0.65rem] text-warning"
                                aria-label={`${d.alerts.length} alert${d.alerts.length > 1 ? 's' : ''}`}
                              >
                                {d.alerts.length}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ── Metrics: stacked grid below lg, individual grid items at lg ── */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:contents">
                        {/* Records */}
                        <div className="flex flex-col gap-0.5 lg:col-span-2 lg:items-end lg:text-right">
                          <span aria-hidden className="font-tag text-[0.6rem] text-foreground/45 lg:hidden">Records</span>
                          <span className="font-mono text-base tabular-nums text-foreground">
                            {fmtNumber(d.recordCount)}
                          </span>
                          <Sparkline
                            values={series}
                            tone="accent"
                            width={72}
                            height={20}
                          />
                          <span className="font-mono text-[0.65rem] tabular-nums text-foreground/45">
                            {growth >= 0 ? '+' : ''}
                            {growth.toFixed(1)}{'% · 7d'}
                          </span>
                        </div>

                        {/* Completeness */}
                        <div className="flex flex-col gap-1 lg:col-span-2 lg:items-end lg:text-right">
                          <span aria-hidden className="font-tag text-[0.6rem] text-foreground/45 lg:hidden">Completeness</span>
                          <div className="flex items-baseline gap-1">
                            <span className="font-mono text-sm tabular-nums text-foreground">
                              {fmtPct(completePct, { decimals: 1 })}
                            </span>
                            <span
                              className={cn(
                                'font-tag text-[0.6rem]',
                                completeDelta >= 0
                                  ? 'text-success'
                                  : Math.abs(completeDelta) >= 0.5
                                    ? 'text-warning'
                                    : 'text-foreground/45'
                              )}
                            >
                              {completeDelta >= 0 ? '+' : ''}
                              {completeDelta.toFixed(2)}{'pp 7d'}
                            </span>
                          </div>
                          <div className="h-[2px] w-full rounded-full bg-border">
                            <div
                              className={cn('h-full rounded-full transition-[width]', completeTone)}
                              style={{ width: `${completePct * 100}%` }}
                            />
                          </div>
                        </div>

                        {/* Trust gauge */}
                        <div className="flex flex-col items-center gap-0.5 lg:col-span-1">
                          <span aria-hidden className="font-tag text-[0.6rem] text-foreground/45 lg:hidden">Trust</span>
                          <RiskGauge score={score} />
                          <span className={cn('font-tag normal-case text-[0.6rem]', tone.text)}>
                            {label}
                          </span>
                        </div>

                        {/* Last anchor */}
                        <div className="flex flex-col gap-1 lg:col-span-2 lg:items-end lg:text-right">
                          <span aria-hidden className="font-tag text-[0.6rem] text-foreground/45 lg:hidden">Last anchor</span>
                          <span className="font-mono text-[0.72rem] tabular-nums text-foreground">
                            {fmtRelativeTime(d.lastAttestedAt)}
                          </span>
                          <AttestationChip attestation={d.attestation} />
                        </div>
                      </div>

                      {/* ── Arrow — lg only ── */}
                      <div className="hidden lg:col-span-1 lg:flex lg:justify-end">
                        <ArrowRight
                          className="size-3.5 text-foreground/30 transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
                          strokeWidth={1.75}
                        />
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      {datasets.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border pt-4 font-mono text-[0.7rem] tabular-nums md:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <span className="font-tag text-foreground/45">Avg completeness</span>
            <span className="text-foreground">{fmtPct(avgCompleteness, { decimals: 1 })}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-tag text-foreground/45">Total records</span>
            <span className="text-foreground">{fmtNumber(totalRecords)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-tag text-foreground/45">Total templates</span>
            <span className="text-foreground">{fmtNumber(totalTemplates)}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-tag text-foreground/45">Attested last 24h</span>
            <span className="text-foreground">{attestedLast24h}</span>
          </div>
        </div>
      )}
    </section>
  )
}
