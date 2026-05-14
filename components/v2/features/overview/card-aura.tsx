'use client'

/**
 * CardAura — layered surface treatment for v2 floating cards.
 *
 * Mechanism (ported from hmm's AgentBlob + GlassPanel):
 *   1. Radial-gradient "blob" anchored at a parametric position — blurred 20px
 *      so it reads as ambient warmth, not a hard shape.
 *   2. SVG fractalNoise layer desaturated with mix-blend-mode switching per
 *      theme: multiply on light (deepens), soft-light on dark (lifts).
 *
 * Color discipline: no brand greens. Each variant uses a low-saturation
 * warm or cool tone. Each carries a separate light/dark alpha so the blob
 * is visible on both cream surfaces (#fbfaf7) and near-black (#111111).
 */

const FILTER_ID_PREFIX = 'v2-card-noise'

type AuraVariant = 'warm' | 'cool' | 'neutral' | 'amber'

interface CardAuraProps {
  /**
   * warm    → cream-rose  (Total NAV)
   * cool    → steel-blue  (NAV per share)
   * neutral → warm cream  (Shares outstanding)
   * amber   → ochre gold  (Next publish)
   */
  variant?: AuraVariant
  /** Center-x of the blob in 0–100 percent. Default 50 */
  blobX?: number
  /** Center-y of the blob in 0–100 percent. Default 82 */
  blobY?: number
  /** Unique suffix for the SVG filter id (must be document-unique). */
  id: string
}

/**
 * Each tuple: [lightCenter, lightOuter, darkCenter, darkOuter]
 * Values are CSS color strings; the blob gradient uses them directly.
 *
 * Light mode: low-opacity tints on near-white (#fbfaf7)
 * Dark mode:  higher-opacity to register on near-black (#111111)
 */
const PALETTE: Record<AuraVariant, {
  light: [string, string]
  dark:  [string, string]
}> = {
  warm: {
    light: ['rgba(220,170,140,0.16)', 'rgba(200,150,120,0.06)'],
    dark:  ['rgba(220,140, 90,0.28)', 'rgba(200,110, 60,0.12)'],
  },
  cool: {
    light: ['rgba(140,170,220,0.14)', 'rgba(110,150,200,0.05)'],
    dark:  ['rgba( 80,120,200,0.26)', 'rgba( 60,100,170,0.11)'],
  },
  neutral: {
    light: ['rgba(220,210,185,0.14)', 'rgba(200,190,165,0.05)'],
    dark:  ['rgba(190,170,120,0.24)', 'rgba(160,140, 90,0.10)'],
  },
  amber: {
    light: ['rgba(220,185, 80,0.14)', 'rgba(200,165, 60,0.05)'],
    dark:  ['rgba(200,145, 20,0.28)', 'rgba(170,120,  0,0.12)'],
  },
}

export function CardAura({
  variant = 'neutral',
  blobX = 50,
  blobY = 82,
  id,
}: CardAuraProps) {
  const { light, dark } = PALETTE[variant]
  const filterId = `${FILTER_ID_PREFIX}-${id}`

  const lightGradient = `radial-gradient(circle at ${blobX}% ${blobY}%, ${light[0]} 0%, ${light[1]} 40%, transparent 70%)`
  const darkGradient  = `radial-gradient(circle at ${blobX}% ${blobY}%, ${dark[0]}  0%, ${dark[1]}  40%, transparent 70%)`

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
      aria-hidden
    >
      {/* Light mode blob */}
      <div
        className="absolute inset-0 dark:hidden"
        style={{
          background: lightGradient,
          filter: 'blur(20px)',
        }}
      />
      {/* Dark mode blob */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background: darkGradient,
          filter: 'blur(20px)',
        }}
      />

      {/* Fractal-noise overlay — desaturated, blend shifts per theme */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.08] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-soft-light"
        aria-hidden
      >
        <filter id={filterId}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </div>
  )
}
