import type { RunResult } from '@/lib/api/types'
import { fmtNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  result: RunResult
  className?: string
}

export function RunResultRenderer({ result, className }: Props) {
  switch (result.shape) {
    case 'scalar':
      return <ScalarResult result={result} className={className} />
    case 'tabular':
      return <TabularResult result={result} className={className} />
    case 'time-series':
      return <TimeSeriesResult result={result} className={className} />
    case 'distribution':
      return <DistributionResult result={result} className={className} />
  }
}

// ---------- Scalar ----------

type ScalarResultProps = {
  result: Extract<RunResult, { shape: 'scalar' }>
  className?: string
}

function ScalarResult({ result, className }: ScalarResultProps) {
  const display =
    typeof result.value === 'number'
      ? fmtNumber(result.value, { decimals: 4 })
      : String(result.value)

  return (
    <div className={cn('flex flex-col items-start gap-1', className)}>
      <span
        className="font-display text-5xl font-semibold tracking-tight tabular-nums"
        aria-label={`Result: ${display}`}
      >
        {display}
      </span>
      {result.unit && (
        <span className="font-tag text-sm text-muted-foreground">{result.unit}</span>
      )}
    </div>
  )
}

// ---------- Tabular ----------

type TabularResultProps = {
  result: Extract<RunResult, { shape: 'tabular' }>
  className?: string
}

function TabularResult({ result, className }: TabularResultProps) {
  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            {result.columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, ri) => (
            <tr key={ri} className="border-t border-border/60">
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={cn(
                    'px-3 py-2 tabular-nums',
                    typeof cell === 'number' ? 'text-right' : ''
                  )}
                >
                  {cell == null
                    ? <span className="text-muted-foreground/50">—</span>
                    : typeof cell === 'number'
                      ? fmtNumber(cell, { decimals: 3 })
                      : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------- Time-series ----------

type TimeSeriesResultProps = {
  result: Extract<RunResult, { shape: 'time-series' }>
  className?: string
}

function TimeSeriesResult({ result, className }: TimeSeriesResultProps) {
  return (
    <div className={cn('grid gap-3', className)}>
      <p className="font-tag text-xs text-muted-foreground">
        Metric: <span className="text-foreground">{result.metric}</span>
        {' '}· Plan 06 wires the full chart
      </p>
      <div className="grid gap-2">
        {result.series.map((s) => {
          const last = s.points.at(-1)
          return (
            <div
              key={s.name}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2"
            >
              <span className="text-sm">{s.name}</span>
              <span className="font-mono text-sm tabular-nums text-muted-foreground">
                {last != null ? fmtNumber(last.v, { decimals: 4 }) : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---------- Distribution ----------

type DistributionResultProps = {
  result: Extract<RunResult, { shape: 'distribution' }>
  className?: string
}

function DistributionResult({ result, className }: DistributionResultProps) {
  const max = Math.max(...result.bins.map((b) => b.value), 1)

  return (
    <div className={cn('grid gap-2', className)}>
      {result.bins.map((bin) => {
        const pct = (bin.value / max) * 100
        return (
          <div key={bin.label} className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3">
            <span className="text-sm truncate">{bin.label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary/70"
                style={{ width: `${pct}%` }}
                aria-label={`${bin.label}: ${bin.value}`}
              />
            </div>
            <span className="text-right font-mono text-xs tabular-nums text-muted-foreground">
              {fmtNumber(bin.value, { decimals: 0 })}
            </span>
          </div>
        )
      })}
    </div>
  )
}
