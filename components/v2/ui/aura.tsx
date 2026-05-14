'use client'

/**
 * Aura — palette-tinted radial gradient overlay for Surface cards.
 *
 * Drop inside a relatively positioned parent (Surface is always positioned).
 * Renders behind content, ignores pointer events. Three variants:
 *   <Aura color="#3F7D5F" />                  — single-color glow
 *   <Aura colors={['#3F7D5F','#8EA4D2']}S />   — multi-color blobs (project-style)
 *   <Aura color="#3F7D5F" tone="soft" />      — extra-subtle for sub-cards
 *
 * Pair freely with <Surface>.
 */

interface AuraOwnProps {
  /** Convenience for single-color aura. */
  color?: string
  /** Optional second hex used at the 40% gradient stop — gives a two-tone wash
   *  (cf. hmm's AgentBlob using color → colorEnd). Falls back to `color`. */
  colorEnd?: string
  /** Multi-color aura — supply 2-5 palette hexes for a project-style spread. */
  colors?: string[]
  /** Where the primary blob anchors. Default 'br' (bottom-right). */
  position?: 'tl' | 'tr' | 'bl' | 'br' | 'c'
  /** Visual intensity — defaults to 'normal'. Use 'soft' for tiny sub-cards. */
  tone?: 'soft' | 'normal' | 'strong'
  /** Tailwind size class for the blob (height/width). Default 'h-64 w-64'. */
  size?: string
  /** Override the blur — Tailwind class. Default 'blur-3xl'. */
  blur?: string
}

const POS_CLASSES: Record<NonNullable<AuraOwnProps['position']>, string> = {
  tl: '-top-20 -left-16',
  tr: '-top-20 -right-16',
  bl: '-bottom-20 -left-16',
  br: '-bottom-24 -right-20',
  c: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
}

const TONE_OPACITY: Record<NonNullable<AuraOwnProps['tone']>, number> = {
  soft: 0.7,
  normal: 1,
  strong: 1.3,
}

function hexA(hex: string, alpha: number): string {
  // Accept #RGB / #RRGGBB; tack on alpha
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}

export function Aura({
  color,
  colorEnd,
  colors,
  position = 'br',
  tone = 'normal',
  size = 'h-64 w-64',
  blur = 'blur-3xl',
}: AuraOwnProps) {
  const opacity = TONE_OPACITY[tone]

  // Multi-color spread: scatter overlapping radial blobs across the surface.
  if (colors && colors.length > 0) {
    const positions = [
      { pos: '78% 32%', size: '55% 60%' },
      { pos: '90% 70%', size: '50% 55%' },
      { pos: '65% 85%', size: '45% 50%' },
      { pos: '20% 35%', size: '40% 45%' },
      { pos: '50% 50%', size: '50% 50%' },
    ]
    const layers = colors
      .slice(0, positions.length)
      .map((c, i) => {
        const p = positions[i]
        return `radial-gradient(ellipse ${p.size} at ${p.pos}, ${hexA(c, 0.27 * opacity)} 0%, transparent 70%)`
      })
      .join(', ')
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
        <div className="absolute inset-0" style={{ background: layers, filter: 'blur(22px)' }} />
        <NoiseOverlay />
      </div>
    )
  }

  // Single-color radial: focused blob in a corner. If colorEnd is supplied,
  // the 40% stop uses it for a two-tone wash (à la hmm AgentBlob).
  const c = color ?? '#888888'
  const cEnd = colorEnd ?? c
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <div
        className={`absolute ${POS_CLASSES[position]} ${size} ${blur} rounded-full`}
        style={{
          background: `radial-gradient(circle, ${hexA(c, 0.4 * opacity)} 0%, ${hexA(cEnd, 0.13 * opacity)} 40%, transparent 70%)`,
        }}
      />
    </div>
  )
}

/**
 * NoiseOverlay — desaturated fractal noise blended with the surface to add
 * texture. Multiply on light surfaces deepens; soft-light on dark lifts.
 */
function NoiseOverlay() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.08] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-soft-light"
      aria-hidden="true"
    >
      <filter id="v2-aura-noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#v2-aura-noise)" />
    </svg>
  )
}
