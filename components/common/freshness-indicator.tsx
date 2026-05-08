import { fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  timestamp: string | Date | null | undefined
  className?: string
}

function bucket(timestamp: string | Date | null | undefined): {
  label: string
  tone: 'live' | 'fresh' | 'stale' | 'unknown'
} {
  if (!timestamp) return { label: '—', tone: 'unknown' }
  const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp
  if (Number.isNaN(d.getTime())) return { label: '—', tone: 'unknown' }
  const ageMs = Date.now() - d.getTime()
  if (ageMs < 60_000) return { label: 'live', tone: 'live' }
  if (ageMs < 3 * 3600_000) return { label: fmtRelativeTime(d), tone: 'fresh' }
  return { label: fmtRelativeTime(d), tone: 'stale' }
}

const toneClass: Record<'live' | 'fresh' | 'stale' | 'unknown', string> = {
  live: 'bg-success',
  fresh: 'bg-info',
  stale: 'bg-warning',
  unknown: 'bg-muted',
}

export function FreshnessIndicator({ timestamp, className }: Props) {
  const { label, tone } = bucket(timestamp)
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-muted-foreground', className)}>
      <span
        aria-hidden
        className={cn(
          'inline-block size-1.5 rounded-full',
          toneClass[tone],
          tone === 'live' && 'animate-pulse'
        )}
      />
      <span>{label}</span>
    </span>
  )
}
