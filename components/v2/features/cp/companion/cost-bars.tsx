'use client'
import { cn } from '@/lib/utils'

export type CostRow = { label: string; amount: number }

type Props = { rows: CostRow[] }

export function CostBars({ rows }: Props) {
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1
  return (
    <div className="space-y-1">
      {rows.map((r) => {
        const pct = (r.amount / total) * 100
        return (
          <div key={r.label} className="space-y-0.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10.5px] text-v2-muted">{r.label}</span>
              <span className={cn('font-mono text-[10.5px] tabular-nums', r.amount === 0 ? 'text-v2-muted/60' : 'text-v2-foreground')}>
                ${r.amount.toFixed(4)}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-v2-foreground/[0.04]">
              <div className="h-full rounded-full bg-v2-foreground/40" style={{ width: `${Math.max(pct, 0.5)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
