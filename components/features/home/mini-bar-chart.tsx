import { cn } from '@/lib/utils'

type Props = {
  values: number[]
  /** Optional labels shown under bars when there's enough room. */
  labels?: string[]
  /** Highlight the rightmost (most recent) bar with the accent. */
  highlightLast?: boolean
  className?: string
  height?: number
  barClassName?: string
}

export function MiniBarChart({
  values,
  labels,
  highlightLast = true,
  className,
  height = 56,
  barClassName,
}: Props) {
  if (!values.length) return <div className={cn('h-14', className)} aria-hidden />

  const max = Math.max(...values, 1)
  const last = values.length - 1

  return (
    <div className={cn('grid gap-1.5', className)} aria-hidden>
      <div
        className="grid items-end gap-1"
        style={{
          gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))`,
          height,
        }}
      >
        {values.map((v, i) => {
          const pct = Math.max(0.06, v / max)
          const isLast = i === last
          return (
            <div
              key={i}
              className={cn(
                'relative w-full self-end rounded-[2px] transition-all',
                isLast && highlightLast
                  ? 'bg-accent/80'
                  : 'bg-foreground/15',
                barClassName,
              )}
              style={{ height: `${pct * 100}%` }}
            >
              {isLast && highlightLast && (
                <span className="pointer-events-none absolute -top-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-accent" />
              )}
            </div>
          )
        })}
      </div>
      {labels && labels.length === values.length && (
        <div
          className="grid items-center gap-1 font-mono text-[0.6rem] tabular-nums text-foreground/40"
          style={{ gridTemplateColumns: `repeat(${values.length}, minmax(0, 1fr))` }}
        >
          {labels.map((l, i) => (
            <span key={i} className="truncate text-center">
              {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
