import { FreshnessIndicator } from '@/components/common/freshness-indicator'

type Props = {
  /** 0..1 fraction. */
  onTimePct?: number
  lastAttestedAt: string
}

export function AttestationCell({ onTimePct, lastAttestedAt }: Props) {
  const pct = onTimePct == null ? '—' : `${Math.round(onTimePct * 100)}%`
  return (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="font-medium tabular-nums">{pct}</span>
      <span className="text-muted-foreground">·</span>
      <FreshnessIndicator timestamp={lastAttestedAt} />
    </span>
  )
}
