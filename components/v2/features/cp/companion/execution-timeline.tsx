'use client'
import type { TriggerKind } from '@/components/v2/features/cp/analysis-workbench'
import { formatExecutionTime } from '@/components/v2/features/cp/analysis-workbench'

type Props = {
  executions: Date[] | null
  mode: TriggerKind
  eventSource?: string
}

export function ExecutionTimeline({ executions, mode, eventSource }: Props) {
  if (mode === 'manual') {
    return (
      <p className="font-mono text-[11px] text-v2-muted">
        Triggered on demand only — no scheduled executions.
      </p>
    )
  }
  if (mode === 'event') {
    return (
      <p className="font-mono text-[11px] text-v2-muted">
        On {eventSource || '(select an event source)'}
      </p>
    )
  }
  if (executions === null) {
    return (
      <p className="font-mono text-[11px] text-v2-warning/80">
        Could not parse cron expression — check syntax.
      </p>
    )
  }
  if (executions.length === 0) {
    return <p className="font-mono text-[11px] text-v2-muted">No upcoming executions.</p>
  }

  const N = executions.length
  // SVG layout
  const W = 600 // logical viewport width
  const padX = 24
  const baseY = 24

  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
        Next {N} executions
      </p>
      <svg viewBox={`0 0 ${W} 56`} className="w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1={padX} y1={baseY} x2={W - padX} y2={baseY} stroke="currentColor" strokeWidth="1" className="text-v2-border" />
        {executions.map((_, i) => {
          const x = padX + ((W - 2 * padX) * i) / Math.max(N - 1, 1)
          return <circle key={i} cx={x} cy={baseY} r="3.5" className="fill-v2-foreground" />
        })}
      </svg>
      <ol className="grid grid-cols-5 gap-2 font-mono text-[10px] tabular-nums text-v2-muted">
        {executions.map((d, i) => (
          <li key={i} className="truncate text-center" title={d.toISOString()}>
            {formatExecutionTime(d)}
          </li>
        ))}
      </ol>
    </div>
  )
}
