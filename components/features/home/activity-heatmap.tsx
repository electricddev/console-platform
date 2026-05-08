import type React from 'react'
import { Flame, Calendar, Activity, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Run } from '@/lib/api/types'
import { CornerMarks } from './corner-marks'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  runs: Run[]
  /** Reference "today" timestamp in ms (epoch). Pass `Date.now()`-equivalent from the parent server component. */
  now: number
  className?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKS = 12
const DAYS_PER_WEEK = 7
const TOTAL_CELLS = WEEKS * DAYS_PER_WEEK // 84
const DAY_MS = 86_400_000

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Floor a timestamp to the start of the local-noon anchor day.
 * Using noon (12:00) avoids DST-edge gotchas where midnight can flip a day.
 */
function toNoonDay(ts: number): number {
  const d = new Date(ts)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0)
}

/**
 * Convert a Run's queuedAt timestamp into { col, row } grid coordinates.
 * col  0 = leftmost week  (oldest),  col 11 = rightmost (newest, anchored to now)
 * row  0 = Monday,                   row  6 = Sunday
 *
 * Returns null if the run falls outside the 84-day window or in the future.
 */
function cellCoords(
  runTs: number,
  nowNoon: number,
  nowDayOfWeek: number, // Mon=0 … Sun=6
): { col: number; row: number } | null {
  const ageDays = Math.round((nowNoon - toNoonDay(runTs)) / DAY_MS)
  if (ageDays < 0 || ageDays >= TOTAL_CELLS) return null

  // How many columns from the right?
  const colFromRight = Math.floor(ageDays / DAYS_PER_WEEK)
  const col = WEEKS - 1 - colFromRight

  // Row: today lands on `nowDayOfWeek`. Older days count back through the week.
  const rowOffset = (nowDayOfWeek - (ageDays % DAYS_PER_WEEK) + DAYS_PER_WEEK) % DAYS_PER_WEEK
  const row = rowOffset

  return { col, row }
}

function tierClass(count: number): string {
  if (count === 0) return 'bg-foreground/5'
  if (count === 1) return 'bg-accent/15'
  if (count <= 3) return 'bg-accent/30'
  if (count <= 6) return 'bg-accent/55'
  return 'bg-accent/85'
}

// ─── Stat column item ─────────────────────────────────────────────────────────

type StatItemProps = {
  icon: React.ReactNode
  value: string
  label: string
}

function StatItem({ icon, value, label }: StatItemProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span aria-hidden className="self-center text-muted-foreground">{icon}</span>
      <span className="font-mono text-2xl font-medium tabular-nums leading-none tracking-tight text-foreground">
        {value}
      </span>
      <span className="font-tag text-foreground/55">
        <span aria-hidden>{'// '}</span>{label}
      </span>
    </div>
  )
}

// ─── Legend ───────────────────────────────────────────────────────────────────

const LEGEND_TIERS = [0, 1, 2, 4, 7] as const

function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5" aria-label="Intensity legend">
      <span className="font-mono text-[0.6rem] text-foreground/40 tabular-nums">less</span>
      {LEGEND_TIERS.map((count) => (
        <div
          key={count}
          aria-hidden
          className={cn(
            'size-[10px] rounded-[2px]',
            tierClass(count),
          )}
        />
      ))}
      <span className="font-mono text-[0.6rem] text-foreground/40 tabular-nums">more</span>
    </div>
  )
}

// ─── ActivityHeatmap (root) ───────────────────────────────────────────────────

export function ActivityHeatmap({ runs, now, className }: Props): React.ReactElement {
  // ── 1. Build grid counts ───────────────────────────────────────────────────

  const nowNoon = toNoonDay(now)
  const nowDate = new Date(now)
  // Mon=0 … Sun=6
  const nowDayOfWeek = (nowDate.getDay() + 6) % 7

  // counts[col][row] = number of runs
  const counts: number[][] = Array.from({ length: WEEKS }, () =>
    Array(DAYS_PER_WEEK).fill(0),
  )

  for (const run of runs) {
    const runTs = new Date(run.queuedAt).getTime()
    const coords = cellCoords(runTs, nowNoon, nowDayOfWeek)
    if (coords !== null) {
      counts[coords.col][coords.row]++
    }
  }

  // ── 2. Compute stats ───────────────────────────────────────────────────────

  // Total (last 12 weeks)
  let totalRuns = 0
  let peakDayCount = 0

  for (let c = 0; c < WEEKS; c++) {
    for (let r = 0; r < DAYS_PER_WEEK; r++) {
      const n = counts[c][r]
      totalRuns += n
      if (n > peakDayCount) peakDayCount = n
    }
  }

  // Active days in last 28 days (cols 8–11, i.e. last 4 weeks)
  let activeDays28 = 0
  for (let c = WEEKS - 4; c < WEEKS; c++) {
    for (let r = 0; r < DAYS_PER_WEEK; r++) {
      if (counts[c][r] >= 1) activeDays28++
    }
  }

  // Current streak: consecutive days ending today with ≥1 run
  // Walk backwards from ageDays=0 (today) until we hit a 0 day
  let streak = 0
  for (let ageDays = 0; ageDays < TOTAL_CELLS; ageDays++) {
    const coords = cellCoords(nowNoon - ageDays * DAY_MS, nowNoon, nowDayOfWeek)
    if (coords === null) break
    if (counts[coords.col][coords.row] === 0) break
    streak++
  }

  // Find peak cell coordinates (first one if tied)
  let peakCol = -1
  let peakRow = -1
  for (let c = 0; c < WEEKS && peakCol === -1; c++) {
    for (let r = 0; r < DAYS_PER_WEEK; r++) {
      if (counts[c][r] === peakDayCount && peakDayCount > 0) {
        peakCol = c
        peakRow = r
        break
      }
    }
  }

  // ── 3. Build week labels ───────────────────────────────────────────────────
  // Show odd indices (0, 2, 4, … 10) → that's weeks 12w, 10w, 8w, …, 2w
  // Index 11 (rightmost) shows "now"
  const weekLabels: (string | null)[] = Array.from({ length: WEEKS }, (_, i) => {
    if (i === WEEKS - 1) return 'now'
    if (i % 2 === 0) return `${WEEKS - 1 - i}w`
    return null
  })

  const isEmpty = runs.length === 0

  return (
    <section
      aria-label="Run intensity heatmap — last 12 weeks"
      className={cn('relative overflow-hidden rounded-md border border-border bg-surface px-6 py-5', className)}
    >
      {/* Decorative accent halo */}
      <div
        aria-hidden
        className="accent-halo pointer-events-none absolute inset-y-0 right-0 w-1/3 opacity-60"
      />

      {/* Corner marks */}
      <CornerMarks tone="subtle" inset={4} />

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-2xl tracking-tight text-foreground">
            Run intensity
          </h2>
          <p className="font-tag text-foreground/55">
            {'// last 12 weeks · '}{totalRuns}{' runs'}
          </p>
        </div>

        {/* Stats row — flanks the title at md+ */}
        <div
          className="flex flex-wrap items-baseline gap-x-6 gap-y-2"
          aria-label="Activity statistics"
        >
          <StatItem
            icon={<Activity size={12} strokeWidth={1.75} />}
            value={totalRuns.toLocaleString('en-US')}
            label="total"
          />
          <StatItem
            icon={<Flame size={12} strokeWidth={1.75} />}
            value={peakDayCount.toString()}
            label="peak day"
          />
          <StatItem
            icon={<Calendar size={12} strokeWidth={1.75} />}
            value={activeDays28.toString()}
            label="active 28d"
          />
          <StatItem
            icon={<TrendingUp size={12} strokeWidth={1.75} />}
            value={streak.toString()}
            label="streak"
          />
        </div>
      </div>

      {/* ── Body: grid (full width) ─────────────────────────────────────── */}
      <div className="relative z-10 mt-6">

        {/* Grid — fills full width via 1fr columns */}
        <div className="w-full">

          {/* Week labels row */}
          <div
            className="mb-1.5 grid"
            style={{
              gridTemplateColumns: `1.75rem repeat(${WEEKS}, minmax(0, 1fr))`,
              gap: '6px',
            }}
            aria-hidden
          >
            {/* Spacer for day-label column */}
            <div />
            {weekLabels.map((label, i) => (
              <div
                key={i}
                className="flex items-end justify-center"
                style={{ height: '14px' }}
              >
                {label !== null ? (
                  <span className="font-mono text-[0.6rem] tabular-nums text-foreground/40 leading-none">
                    {label}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {/* Day rows */}
          <div className="flex flex-col" style={{ gap: '6px' }}>
            {DAY_LABELS.map((dayName, rowIdx) => {
              const showLabel = rowIdx === 0 || rowIdx === 2 || rowIdx === 4 // Mon, Wed, Fri
              return (
                <div
                  key={dayName}
                  className="grid items-center"
                  style={{
                    gridTemplateColumns: `1.75rem repeat(${WEEKS}, minmax(0, 1fr))`,
                    gap: '6px',
                  }}
                >
                  {/* Day label */}
                  <div className="flex h-7 items-center justify-end pr-1.5">
                    {showLabel ? (
                      <span className="font-mono text-[0.6rem] tabular-nums text-foreground/40 leading-none">
                        {dayName.slice(0, 3)}
                      </span>
                    ) : null}
                  </div>

                  {/* Week cells */}
                  {Array.from({ length: WEEKS }, (_, colIdx) => {
                    const count = counts[colIdx][rowIdx]

                    // Future detection: compute ageDays for this cell
                    const colFromRight = WEEKS - 1 - colIdx
                    const rowFromToday = (rowIdx - nowDayOfWeek + DAYS_PER_WEEK) % DAYS_PER_WEEK
                    const ageDays = colFromRight * DAYS_PER_WEEK + rowFromToday
                    const isFuture =
                      colIdx === WEEKS - 1 &&
                      rowIdx > nowDayOfWeek

                    const isToday = colIdx === WEEKS - 1 && rowIdx === nowDayOfWeek
                    const isPeak =
                      peakDayCount > 0 &&
                      colIdx === peakCol &&
                      rowIdx === peakRow

                    const cellDate = new Date(nowNoon - ageDays * DAY_MS)
                    const dateStr = cellDate.toLocaleDateString('en-GB', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                    })
                    const titleAttr = isFuture
                      ? dateStr
                      : `${dateStr} · ${count} run${count !== 1 ? 's' : ''}`

                    return (
                      <div
                        key={colIdx}
                        title={titleAttr}
                        className={cn(
                          'h-7 rounded-[3px] transition-colors hover:ring-1 hover:ring-foreground/30',
                          isFuture ? 'opacity-30 bg-foreground/5' : tierClass(count),
                          isToday && !isFuture && 'ring-1 ring-accent',
                          isPeak && !isToday && 'ring-1 ring-foreground/40',
                        )}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Legend row */}
          <div className="mt-3 flex items-center justify-end">
            <HeatmapLegend />
          </div>
        </div>

      </div>

      {/* Empty state overlay */}
      {isEmpty && (
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-6 bottom-10 top-[4.5rem] flex items-center justify-center"
        >
          <p className="font-display text-base italic text-muted-foreground/70 text-center leading-relaxed">
            No activity yet — runs will appear here as they execute.
          </p>
        </div>
      )}

      {/* Decorative tick-rule strip along the bottom */}
      <div
        aria-hidden
        className="tick-rule-x mask-fade-x pointer-events-none absolute inset-x-0 bottom-0 h-[1.5px] opacity-40"
      />
    </section>
  )
}
