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
 * PrivacyBar — horizontal stacked bar showing the proportion of fields in
 * each tier. Rendered in canonical order: private | join | aggregate | dimension | select.
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
  const summary = PRIVACY_LEVELS_ORDERED.map((k) => `${counts[k]} ${k}`).join(', ')
  return (
    <div
      className={cn(
        'flex w-full overflow-hidden bg-v2-foreground/4',
        rounded && 'rounded-full',
        height
      )}
      role="img"
      aria-label={`Privacy mix: ${summary}`}
    >
      {PRIVACY_LEVELS_ORDERED.map((k) => {
        const w = counts[k] / total
        return w > 0 ? (
          <span
            key={k}
            className={cn(PRIVACY_TONE[k].dot, 'h-full')}
            style={{ width: `${w * 100}%` }}
          />
        ) : null
      })}
    </div>
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
