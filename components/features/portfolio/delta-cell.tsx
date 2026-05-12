import type { Delta } from '@/lib/api/schemas'
import { formatDelta } from '@/lib/data/acred/format-delta'
import { cn } from '@/lib/utils'

type Props = {
  delta: Delta | undefined
  formatValue: (v: number) => string
}

export function DeltaCell({ delta, formatValue }: Props) {
  if (!delta) return <span className="text-muted-foreground">—</span>
  const { signedText, tone } = formatDelta(delta)
  const cls =
    tone === 'positive'
      ? 'text-success'
      : tone === 'negative'
        ? 'text-danger'
        : 'text-muted-foreground'
  return (
    <span className="inline-flex flex-col tabular-nums">
      <span className="text-sm">{formatValue(delta.value)}</span>
      <span className={cn('text-xs', cls)}>{signedText}</span>
    </span>
  )
}
