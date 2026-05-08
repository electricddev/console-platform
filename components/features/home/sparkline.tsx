import { cn } from '@/lib/utils'

type Props = {
  values: number[]
  className?: string
  width?: number
  height?: number
  /** Tone: positive (success), negative (destructive), neutral (foreground/40), accent */
  tone?: 'positive' | 'negative' | 'neutral' | 'accent'
}

const toneStroke: Record<NonNullable<Props['tone']>, string> = {
  positive: 'stroke-success',
  negative: 'stroke-destructive',
  neutral: 'stroke-foreground/40',
  accent: 'stroke-accent',
}

const toneFill: Record<NonNullable<Props['tone']>, string> = {
  positive: 'fill-success/10',
  negative: 'fill-destructive/10',
  neutral: 'fill-foreground/5',
  accent: 'fill-accent/10',
}

export function Sparkline({
  values,
  className,
  width = 112,
  height = 32,
  tone = 'neutral',
}: Props) {
  if (!values.length) {
    return <div className={cn('h-7 w-24', className)} aria-hidden />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = values.length > 1 ? width / (values.length - 1) : 0

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 4) - 2
    return [x, y] as const
  })

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')
  const areaPath = `${linePath} L${width} ${height} L0 ${height} Z`

  return (
    <svg
      role="presentation"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <path d={areaPath} className={toneFill[tone]} stroke="none" />
      <path
        d={linePath}
        className={cn(toneStroke[tone], '[stroke-width:1.25] fill-none')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={1.75}
          className={cn(toneStroke[tone], 'fill-background [stroke-width:1.25]')}
        />
      )}
    </svg>
  )
}
