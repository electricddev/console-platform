import { cn } from '@/lib/utils'

type Slice = {
  label: string
  value: number
  /** Tailwind text-* utility used for the slice color (via stroke=currentColor). */
  toneClass?: string
}

type Props = {
  slices: Slice[]
  size?: number
  /** Stroke thickness (donut width). */
  thickness?: number
  /** Center number override; defaults to total. */
  centerValue?: string
  /** Center label below the number. */
  centerLabel?: string
  className?: string
}

export function DonutChart({
  slices,
  size = 88,
  thickness = 8,
  centerValue,
  centerLabel,
  className,
}: Props) {
  const total = slices.reduce((a, s) => a + s.value, 0)
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const cx = size / 2
  const cy = size / 2

  let offset = 0
  const arcs = slices.map((slice, i) => {
    const fraction = total > 0 ? slice.value / total : 0
    const length = fraction * circumference
    const arc = {
      key: `${slice.label}-${i}`,
      length,
      offset,
      toneClass: slice.toneClass ?? 'text-foreground/40',
    }
    offset += length
    return arc
  })

  const display = centerValue ?? total.toString()

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)} aria-hidden>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          className="stroke-border fill-none"
          strokeWidth={thickness}
        />
        {/* arcs */}
        {total > 0 &&
          arcs.map((a) => (
            <circle
              key={a.key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              strokeWidth={thickness}
              strokeLinecap="butt"
              className={cn('stroke-current transition-[stroke-dashoffset]', a.toneClass)}
              strokeDasharray={`${a.length} ${circumference - a.length}`}
              strokeDashoffset={-a.offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          ))}
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0">
        <span className="font-mono text-[1.1rem] font-medium tabular-nums leading-none">
          {display}
        </span>
        {centerLabel && (
          <span className="mt-0.5 font-tag text-foreground/55 leading-none">{centerLabel}</span>
        )}
      </div>
    </div>
  )
}
