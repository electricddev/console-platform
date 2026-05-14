'use client'

import { Link as LinkIcon, Lock, Sigma } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PrivacyLevel } from './data-fixture'

/**
 * Single source of truth for privacy-tier styling. Used by chips, dots,
 * bars, icons — everything in the Data page consults this table.
 */
export const PRIVACY_TONE: Record<
  PrivacyLevel,
  {
    label: string
    short: string
    dot: string
    chipBg: string
    chipText: string
    accent: string
    Icon: React.ComponentType<LucideProps>
    description: string
  }
> = {
  'on-chain': {
    label: 'On-chain',
    short: 'On-chain',
    dot: 'bg-v2-success',
    chipBg: 'bg-v2-success/12',
    chipText: 'text-v2-success',
    accent: '#3F7D5F',
    Icon: LinkIcon,
    description:
      'Published as a hash or reference on every block. Anyone can verify against the canonical chain state.',
  },
  queryable: {
    label: 'Queryable · aggregate',
    short: 'Queryable',
    dot: 'bg-v2-info',
    chipBg: 'bg-v2-info/12',
    chipText: 'text-v2-info',
    accent: '#5FA3C7',
    Icon: Sigma,
    description:
      'Counterparties can run approved aggregate computations. Results are returned — raw row values never leave the vault.',
  },
  private: {
    label: 'Private',
    short: 'Private',
    dot: 'bg-v2-foreground/40',
    chipBg: 'bg-v2-foreground/[0.08]',
    chipText: 'text-v2-foreground/80',
    accent: '#71706C',
    Icon: Lock,
    description:
      'Sealed at ingest. Field-level lock — stays inside the vault, no exception, no path out.',
  },
}

export function PrivacyChip({
  level,
  size = 'sm',
  showIcon = false,
}: {
  level: PrivacyLevel
  size?: 'xs' | 'sm'
  showIcon?: boolean
}) {
  const t = PRIVACY_TONE[level]
  const Icon = t.Icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium uppercase tracking-[0.08em]',
        t.chipBg,
        t.chipText,
        size === 'xs' ? 'px-1.5 py-[1px] text-[9.5px]' : 'px-1.5 py-0.5 text-[10px]'
      )}
    >
      {showIcon ? (
        <Icon className="h-3 w-3" strokeWidth={2} aria-hidden />
      ) : (
        <span className={cn('h-1 w-1 rounded-full', t.dot)} aria-hidden />
      )}
      {t.short}
    </span>
  )
}

/**
 * PrivacyBar — horizontal stacked bar showing the proportion of fields in
 * each tier. Used inside dataset rows + at the top of dataset detail panels.
 */
export function PrivacyBar({
  onChain,
  queryable,
  privateCount,
  height = 'h-1',
  rounded = true,
}: {
  onChain: number
  queryable: number
  privateCount: number
  height?: string
  rounded?: boolean
}) {
  const total = Math.max(onChain + queryable + privateCount, 1)
  const segments: Array<{ key: PrivacyLevel; w: number }> = [
    { key: 'on-chain', w: onChain / total },
    { key: 'queryable', w: queryable / total },
    { key: 'private', w: privateCount / total },
  ]
  return (
    <div
      className={cn(
        'flex w-full overflow-hidden bg-v2-foreground/[0.04]',
        rounded && 'rounded-full',
        height
      )}
      role="img"
      aria-label={`Privacy mix: ${onChain} on-chain, ${queryable} queryable, ${privateCount} private`}
    >
      {segments.map((s) =>
        s.w > 0 ? (
          <span
            key={s.key}
            className={cn(PRIVACY_TONE[s.key].dot, 'h-full')}
            style={{ width: `${s.w * 100}%` }}
          />
        ) : null
      )}
    </div>
  )
}

export function countByPrivacy(
  fields: { privacy: PrivacyLevel }[],
  totalFields?: number
): { onChain: number; queryable: number; private: number } {
  const sampled = { 'on-chain': 0, queryable: 0, private: 0 } as Record<PrivacyLevel, number>
  for (const f of fields) sampled[f.privacy]++
  // If we know the true field count, scale the sample to estimate full totals.
  const scale = totalFields ? totalFields / Math.max(fields.length, 1) : 1
  return {
    onChain: Math.round(sampled['on-chain'] * scale),
    queryable: Math.round(sampled.queryable * scale),
    private: Math.round(sampled.private * scale),
  }
}
