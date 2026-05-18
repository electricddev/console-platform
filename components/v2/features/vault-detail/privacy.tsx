'use client'

import { Eye, KeyRound, Layers, Lock, Sigma } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrivacyLevel } from './data-fixture'

/**
 * Single source of truth for privacy-tier styling. Used by chips, dots,
 * bars, icons — everything in the Data page consults this table.
 *
 * Tier gradient: private (most protected) → join → aggregate → dimension → select (most open)
 */
export const PRIVACY_TONE: Record<
  PrivacyLevel,
  {
    label: string
    short: string
    dot: string
    chipBg: string
    chipText: string
    Icon: React.ComponentType<LucideProps>
    description: string
    /** Consumer-facing operation verb (short label shown on consumer surfaces). */
    operationShort: string
    /** One-line tooltip explaining what the consumer can do with this tier. */
    operationHint: string
  }
> = {
  private: {
    label: 'Private',
    short: 'Private',
    dot: 'bg-v2-foreground/40',
    chipBg: 'bg-v2-foreground/[0.08]',
    chipText: 'text-v2-muted',
    Icon: Lock,
    description:
      'Never accessible. Never in queries, results, joins, or aggregations. Blocked at ingest — no path out.',
    operationShort: 'Blocked',
    operationHint: 'Blocked at ingest. Cannot be referenced in any query.',
  },
  join: {
    label: 'Join key',
    short: 'Join',
    dot: 'bg-v2-info',
    chipBg: 'bg-v2-info/12',
    chipText: 'text-v2-info',
    Icon: KeyRound,
    description:
      'Usable as a match key against counterparty data. Raw value is never returned, never aggregated.',
    operationShort: 'Match key',
    operationHint: 'Use only as a join key. Never appears in results.',
  },
  aggregate: {
    label: 'Aggregate',
    short: 'Aggregate',
    dot: 'bg-v2-success',
    chipBg: 'bg-v2-success/12',
    chipText: 'text-v2-success',
    Icon: Sigma,
    description:
      'Only usable inside aggregate functions (SUM, AVG, COUNT, percentiles). Raw row-level value is never returned.',
    operationShort: 'Aggregable',
    operationHint: 'Must be wrapped in SUM / AVG / COUNT / MIN / MAX. Never returned at row level.',
  },
  dimension: {
    label: 'Dimension',
    short: 'Dimension',
    dot: 'bg-v2-warning',
    chipBg: 'bg-v2-warning/12',
    chipText: 'text-v2-warning',
    Icon: Layers,
    description:
      'Usable in GROUP BY and returned as a label. Categorical only — not a numeric or personally identifying value.',
    operationShort: 'Groupable',
    operationHint: 'Use in GROUP BY / WHERE / partition. Returned as a label, not raw.',
  },
  select: {
    label: 'Select',
    short: 'Select',
    dot: 'bg-v2-foreground/70',
    chipBg: 'bg-v2-foreground/[0.07]',
    chipText: 'text-v2-foreground',
    Icon: Eye,
    description:
      'Raw value returnable in query results. Reserved for genuinely non-sensitive fields only.',
    operationShort: 'Returnable',
    operationHint: 'Raw value can appear in your query results.',
  },
}

export function PrivacyChip({
  level,
  size = 'sm',
  showIcon = false,
  mode = 'tier',
}: {
  level: PrivacyLevel
  size?: 'xs' | 'sm'
  showIcon?: boolean
  /** 'tier' (default) renders the originator tier label; 'operation' renders the consumer operation verb. */
  mode?: 'tier' | 'operation'
}) {
  const t = PRIVACY_TONE[level]
  const Icon = t.Icon
  const label = mode === 'operation' ? t.operationShort : t.short
  const titleAttr = mode === 'operation'
    ? level === 'aggregate'
      ? `${t.operationShort} — SUM, AVG, COUNT, MIN, MAX`
      : t.operationHint
    : t.description
  return (
    <span
      title={titleAttr}
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium uppercase tracking-[0.08em]',
        t.chipBg,
        t.chipText,
        size === 'xs' ? 'px-1.5 py-px text-[9.5px]' : 'px-1.5 py-0.5 text-[10px]'
      )}
    >
      {showIcon ? (
        <Icon className="h-3 w-3" strokeWidth={2} aria-hidden />
      ) : (
        <span className={cn('h-1 w-1 rounded-full', t.dot)} aria-hidden />
      )}
      {label}
    </span>
  )
}

/** The canonical order for bar segments and legend rendering. */
export const PRIVACY_LEVELS_ORDERED: PrivacyLevel[] = [
  'private',
  'join',
  'aggregate',
  'dimension',
  'select',
]

/**
 * Muted OKLCH colors for the gradient bar — dimmed ~0.05 chroma from the
 * dot token values so adjacent tiers interpolate into a calm watercolor strip.
 */
const TIER_COLOR_VAR: Record<PrivacyLevel, string> = {
  private:   'oklch(0.55 0.02 250)', // cool gray
  join:      'oklch(0.62 0.08 240)', // muted info-blue
  aggregate: 'oklch(0.62 0.08 160)', // muted success-green
  dimension: 'oklch(0.72 0.09 80)',  // muted warning-amber
  select:    'oklch(0.70 0.02 250)', // pale cool gray
}

/**
 * PrivacyBar — single `<div>` with a proportional `linear-gradient` whose
 * color stops sit at the cumulative midpoint of each tier's share. Adjacent
 * tiers naturally interpolate instead of hard-cutting at segment boundaries.
 */
export function PrivacyBar({
  counts,
  height = 'h-1',
  rounded = true,
}: {
  counts: Record<PrivacyLevel, number>
  height?: string
  rounded?: boolean
}) {
  const total = Math.max(
    PRIVACY_LEVELS_ORDERED.reduce((sum, k) => sum + counts[k], 0),
    1,
  )

  // Build cumulative midpoint stops so colors interpolate between tiers.
  let cumulative = 0
  const stops: string[] = []
  for (let i = 0; i < PRIVACY_LEVELS_ORDERED.length; i++) {
    const k = PRIVACY_LEVELS_ORDERED[i]
    const w = counts[k] / total
    const mid = cumulative + w / 2
    cumulative += w
    if (w > 0) {
      stops.push(`var(--privacy-${k}) ${(mid * 100).toFixed(2)}%`)
    }
  }

  // Anchor edges so the leftmost tier color owns 0% and rightmost owns 100%.
  const firstActive = PRIVACY_LEVELS_ORDERED.find((k) => counts[k] > 0) ?? 'private'
  const lastActive = [...PRIVACY_LEVELS_ORDERED].reverse().find((k) => counts[k] > 0) ?? 'select'
  const allStops = [
    `var(--privacy-${firstActive}) 0%`,
    ...stops,
    `var(--privacy-${lastActive}) 100%`,
  ].join(', ')

  const summary = PRIVACY_LEVELS_ORDERED.map((k) => `${counts[k]} ${k}`).join(', ')

  return (
    <div
      className={cn('w-full', rounded && 'rounded-full', height)}
      style={{
        backgroundImage: `linear-gradient(to right, ${allStops})`,
        '--privacy-private': TIER_COLOR_VAR.private,
        '--privacy-join': TIER_COLOR_VAR.join,
        '--privacy-aggregate': TIER_COLOR_VAR.aggregate,
        '--privacy-dimension': TIER_COLOR_VAR.dimension,
        '--privacy-select': TIER_COLOR_VAR.select,
      } as React.CSSProperties}
      role="img"
      aria-label={`Privacy mix: ${summary}`}
    />
  )
}

/**
 * Count sampled fields by privacy tier. If `totalFields` is provided,
 * the sample counts are scaled to estimate full-dataset totals.
 */
export function countByPrivacy(
  fields: { privacy: PrivacyLevel }[],
  totalFields?: number
): Record<PrivacyLevel, number> {
  const sampled: Record<PrivacyLevel, number> = {
    private: 0,
    join: 0,
    aggregate: 0,
    dimension: 0,
    select: 0,
  }
  for (const f of fields) sampled[f.privacy]++
  const scale = totalFields ? totalFields / Math.max(fields.length, 1) : 1
  return {
    private: Math.round(sampled.private * scale),
    join: Math.round(sampled.join * scale),
    aggregate: Math.round(sampled.aggregate * scale),
    dimension: Math.round(sampled.dimension * scale),
    select: Math.round(sampled.select * scale),
  }
}
