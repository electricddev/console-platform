import type { Delta } from '@/lib/api/schemas'
import { formatDelta } from '@/lib/data/acred/format-delta'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  delta: Delta
  formatValue: (v: number) => string
  /** Override the directionality of the arrow icon. Default: matches tone. */
  hideArrow?: boolean
}

const toneClass: Record<Delta['tone'], string> = {
  positive: 'text-success',
  negative: 'text-danger',
  neutral: 'text-muted-foreground',
}

export function DeltaTile({ label, delta, formatValue, hideArrow }: Props) {
  const { signedText, tone } = formatDelta(delta)
  const arrow = hideArrow ? '' : delta.delta > 0 ? '↑' : delta.delta < 0 ? '↓' : ''
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">{label}</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{formatValue(delta.value)}</p>
      <p className={cn('mt-1 text-xs font-medium tabular-nums', toneClass[tone])}>
        {signedText}{arrow ? ` ${arrow}` : ''}
      </p>
    </div>
  )
}
