'use client'

/**
 * Aura — palette-tinted radial gradient overlay for Surface cards.
 *
 * Technique pulled verbatim from hmm (francixku/hmm):
 *
 *   • 1 color  →  AgentBlob: single radial centered at `50% 90%` (bottom-
 *                 center), fading ${color}0x35 → ${color}0x15 → transparent
 *                 at 70%. blur(20px) on the whole layer.
 *
 *   • N colors →  ProjectBlobs: N small radial ellipses scattered to the
 *                 right side of the card, each fading ${color}0x40 →
 *                 transparent at 70%. blur(22px).
 *
 * `seed` provides controlled variation: when a family of colors is passed
 * with a seed, the Aura picks ONE color from the family and ONE bottom-
 * anchored position from a curated set. Cards on the same page can each
 * pass a different seed (e.g. their index) so the page reads as a coherent
 * color family without every card being identical.
 *
 * Intensity has a `variant` knob — hero matches hmm defaults; muted scales
 * alpha by ~0.6 for sub-page cards.
 */

interface AuraOwnProps {
  /** Composition colors. 1 hex = AgentBlob, 2-5 hexes = ProjectBlobs.
   *  With `seed`, the Aura picks one color from the array. */
  colors: string[]
  variant?: 'hero' | 'muted'
  /** Deterministic variation index — picks color from `colors` and position
   *  from the variation set. Omit for default centered behavior. */
  seed?: number
}

const VARIANT_SCALE: Record<NonNullable<AuraOwnProps['variant']>, number> = {
  hero: 1,
  muted: 0.65,
}

/** Bottom-anchored positions for the seed variation. Always lower-half so
 *  the "light from below" feel stays consistent. */
const AGENT_POSITIONS: Array<{ x: number; y: number }> = [
  { x: 50, y: 90 }, // default — center bottom
  { x: 30, y: 88 }, // bottom-left
  { x: 72, y: 88 }, // bottom-right
  { x: 20, y: 95 }, // far-left-bottom
  { x: 80, y: 92 }, // far-right-bottom
  { x: 42, y: 85 }, // slightly off-center
  { x: 62, y: 95 }, // off-right-bottom
]

/** ProjectBlobs positions — lifted from hmm. Right-weighted scatter. */
const PROJECT_POSITIONS = [
  { x: 75, y: 30, w: 55, h: 60 },
  { x: 90, y: 65, w: 50, h: 55 },
  { x: 65, y: 80, w: 45, h: 50 },
  { x: 85, y: 15, w: 40, h: 45 },
  { x: 70, y: 50, w: 50, h: 50 },
]

function hexA(hex: string, alpha: number): string {
  const clamped = Math.min(1, Math.max(0, alpha))
  const a = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${a}`
}

function pickIndex(seed: number | undefined, length: number): number {
  if (seed === undefined || length <= 0) return 0
  // Smear neighboring seeds across the array so adjacent cards don't pick
  // adjacent positions/colors and look identical.
  return Math.abs(seed * 3 + 1) % length
}

export function Aura({ colors, variant = 'hero', seed }: AuraOwnProps) {
  if (!colors || colors.length === 0) return null
  const scale = VARIANT_SCALE[variant]

  // Seeded path — pick ONE color from the array + ONE bottom-anchored
  // position. Always renders an AgentBlob (single radial), just at a
  // varied anchor so the card stays subtle but distinct from its neighbors.
  if (seed !== undefined && colors.length >= 1) {
    const c = colors[pickIndex(seed, colors.length)]
    const pos = AGENT_POSITIONS[pickIndex(seed + 1, AGENT_POSITIONS.length)]
    const a1 = 0.21 * scale
    const a2 = 0.082 * scale
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at ${pos.x}% ${pos.y}%, ${hexA(c, a1)} 0%, ${hexA(c, a2)} 40%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
        <NoiseOverlay />
      </div>
    )
  }

  // Single color → hmm AgentBlob exact (50% 90%)
  if (colors.length === 1) {
    const c = colors[0]
    const a1 = 0.21 * scale
    const a2 = 0.082 * scale
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 90%, ${hexA(c, a1)} 0%, ${hexA(c, a2)} 40%, transparent 70%)`,
            filter: 'blur(20px)',
          }}
        />
        <NoiseOverlay />
      </div>
    )
  }

  // Multi color (no seed) → hmm ProjectBlobs
  const perBlobAlpha = 0.25 * scale
  const layers = colors
    .slice(0, PROJECT_POSITIONS.length)
    .map((c, i) => {
      const p = PROJECT_POSITIONS[i]
      return `radial-gradient(ellipse ${p.w}% ${p.h}% at ${p.x}% ${p.y}%, ${hexA(c, perBlobAlpha)} 0%, transparent 70%)`
    })
    .join(', ')
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <div
        className="absolute inset-0"
        style={{ background: layers, filter: 'blur(22px)' }}
      />
      <NoiseOverlay />
    </div>
  )
}

function NoiseOverlay() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-[0.07] mix-blend-multiply dark:opacity-[0.10] dark:mix-blend-soft-light"
      aria-hidden="true"
    >
      <filter id="v2-aura-noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.9"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#v2-aura-noise)" />
    </svg>
  )
}
