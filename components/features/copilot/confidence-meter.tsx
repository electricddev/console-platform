import { cn } from '@/lib/utils'
import { fmtPct } from '@/lib/format'

export function ConfidenceMeter({ value }: { value: number }) {
  const tone = value > 0.8 ? 'bg-success' : value > 0.5 ? 'bg-warning' : 'bg-destructive'
  return (
    <div className="grid gap-0.5">
      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
        <span className="font-tag">{'// confidence'}</span>
        <span className="tabular-nums">{fmtPct(value)}</span>
      </div>
      <div className="h-1 rounded-full bg-muted">
        <div className={cn('h-1 rounded-full', tone)} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  )
}
