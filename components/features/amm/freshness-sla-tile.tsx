import { cn } from '@/lib/utils'

const SLA_SECONDS = 60

export function FreshnessSlaTile({ freshnessSeconds }: { freshnessSeconds: number }) {
  const breach = freshnessSeconds > SLA_SECONDS
  return (
    <div className={cn('rounded-lg border p-4', breach ? 'border-danger/40 bg-danger/5' : 'border-border bg-surface/40')}>
      <p className="font-tag text-xs text-foreground/55">Freshness SLA</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{freshnessSeconds}s</p>
      <p className={cn('mt-1 text-xs', breach ? 'text-danger' : 'text-muted-foreground')}>
        {breach ? `SLA breach (> ${SLA_SECONDS}s)` : `within ${SLA_SECONDS}s SLA`}
      </p>
    </div>
  )
}
