import { cn } from '@/lib/utils'

type Tone = 'subtle' | 'medium' | 'accent'

type Props = {
  /** Length of each cross arm in px. */
  size?: number
  /** Negative inset = crosses sit outside the parent's edge (architectural framing). */
  inset?: number
  /** Visual weight. */
  tone?: Tone
  className?: string
  /** Render only specific corners. */
  corners?: ReadonlyArray<'tl' | 'tr' | 'bl' | 'br'>
}

const toneClass: Record<Tone, string> = {
  subtle: 'text-foreground/15',
  medium: 'text-foreground/30',
  accent: 'text-accent/70',
}

const cornerPos: Record<'tl' | 'tr' | 'bl' | 'br', string> = {
  tl: 'top-0 left-0',
  tr: 'top-0 right-0',
  bl: 'bottom-0 left-0',
  br: 'bottom-0 right-0',
}

const ALL_CORNERS = ['tl', 'tr', 'bl', 'br'] as const

export function CornerMarks({
  size = 9,
  inset = -4,
  tone = 'subtle',
  className,
  corners = ALL_CORNERS,
}: Props) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-0',
        toneClass[tone],
        className,
      )}
    >
      {corners.map((c) => {
        const [vEdge, hEdge] = c.split('') as ('t' | 'b' | 'l' | 'r')[]
        const styleVars: React.CSSProperties = {
          width: size,
          height: size,
          [vEdge === 't' ? 'top' : 'bottom']: inset,
          [hEdge === 'l' ? 'left' : 'right']: inset,
        }
        return (
          <span key={c} className={cn('absolute', cornerPos[c])} style={styleVars}>
            {/* horizontal arm */}
            <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-[0.5px] bg-current" />
            {/* vertical arm */}
            <span className="absolute top-0 bottom-0 left-1/2 w-px -translate-x-[0.5px] bg-current" />
          </span>
        )
      })}
    </div>
  )
}
