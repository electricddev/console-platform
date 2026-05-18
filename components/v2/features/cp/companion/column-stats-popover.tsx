'use client'
import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type ColumnStats = {
  min: string
  max: string
  nulls: number
  total: number
  topValues: { value: string; count: number }[]
  sparkline: number[]
}

type Props = {
  columnName: string
  type: string
  stats: ColumnStats
  children: ReactNode
}

export function ColumnStatsPopover({ columnName, type, stats, children }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="w-72 border-v2-border bg-v2-surface p-3"
        align="start"
        sideOffset={6}
      >
        <div className="flex items-baseline gap-2">
          <p className="font-mono text-[11px] font-medium text-v2-foreground">{columnName}</p>
          <p className="font-mono text-[9.5px] text-v2-muted">{type}</p>
        </div>

        <dl className="mt-2 space-y-1 font-mono text-[10.5px]">
          <div className="flex justify-between">
            <dt className="text-v2-muted">Range</dt>
            <dd className="tabular-nums text-v2-foreground">{stats.min} – {stats.max}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-v2-muted">Nulls</dt>
            <dd className="tabular-nums text-v2-foreground">{stats.nulls.toLocaleString()} / {stats.total.toLocaleString()}</dd>
          </div>
        </dl>

        {stats.sparkline.length > 0 && (
          <svg viewBox="0 0 60 16" className="mt-2 h-4 w-full" preserveAspectRatio="none" aria-hidden="true">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              points={sparklinePoints(stats.sparkline)}
              className="text-v2-foreground/60"
            />
          </svg>
        )}

        {stats.topValues.length > 0 && (
          <div className="mt-2 border-t border-v2-border/60 pt-2">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Top values</p>
            <ul className="mt-1 space-y-0.5 font-mono text-[10.5px]">
              {stats.topValues.slice(0, 3).map((v) => (
                <li key={v.value} className="flex justify-between">
                  <span className="truncate text-v2-foreground">{v.value}</span>
                  <span className="tabular-nums text-v2-muted">{v.count.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function sparklinePoints(values: number[]): string {
  if (values.length === 0) return ''
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const w = 60
  const h = 16
  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
