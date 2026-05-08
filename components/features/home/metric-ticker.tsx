import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'

type Tile = {
  label: string
  value: string
  caption?: string
  delta?: { direction: 'up' | 'down' | 'flat'; label: string }
  series?: number[]
  tone?: 'positive' | 'negative' | 'neutral' | 'accent'
}

type Props = {
  tiles: Tile[]
  className?: string
}

const deltaTone = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
} as const

const deltaArrow = { up: '↑', down: '↓', flat: '→' } as const

export function MetricTicker({ tiles, className }: Props) {
  return (
    <section
      aria-label="Key indicators"
      className={cn(
        'relative grid grid-cols-1 divide-y divide-border border-y border-border bg-surface md:grid-cols-2 md:divide-x md:divide-y-0 lg:grid-cols-4',
        className,
      )}
    >
      {tiles.map((t) => (
        <article
          key={t.label}
          className="group relative grid gap-3 px-6 py-5 transition-colors hover:bg-muted/40"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 -z-0 h-[60px] w-[80px] bg-dot-fine mask-radial-tr"
          />
          <div className="flex items-start justify-between gap-3">
            <p className="font-tag text-foreground/55">{t.label}</p>
            {t.delta && (
              <span className={cn('font-mono text-[0.7rem] tabular-nums', deltaTone[t.delta.direction])}>
                {deltaArrow[t.delta.direction]} {t.delta.label}
              </span>
            )}
          </div>
          <div className="flex items-end justify-between gap-3">
            <div className="grid gap-0.5">
              <p className="font-mono text-3xl font-medium tabular-nums leading-none tracking-tight">
                {t.value}
              </p>
              {t.caption && (
                <span className="text-[0.7rem] text-muted-foreground">{t.caption}</span>
              )}
            </div>
            {t.series && t.series.length > 0 && (
              <Sparkline values={t.series} tone={t.tone ?? 'accent'} className="opacity-90 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        </article>
      ))}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-1.5 tick-rule-x mask-fade-x"
      />
    </section>
  )
}
