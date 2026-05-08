import { fmtPct } from '@/lib/format'
import { cn } from '@/lib/utils'

export function LeakageRiskMeter({ score }: { score: number }) {
  const tone = score < 0.3 ? 'bg-success' : score < 0.6 ? 'bg-warning' : 'bg-destructive'
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between">
        <span className="font-tag text-foreground/55">{'// leakage risk'}</span>
        <span className="text-xs tabular-nums">{fmtPct(score)}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={cn('h-2 rounded-full transition-all', tone)}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  )
}
