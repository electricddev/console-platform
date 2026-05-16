import { cn } from '@/lib/utils'
import type { ChainId } from './cp-fixtures'

// Chain display metadata — dot color uses opacity variants of existing
// OKLCH token hues (info/success/warning) rather than introducing new tokens.
const CHAIN_META: Record<ChainId, { label: string; dotClass: string }> = {
  ethereum: { label: 'ETH', dotClass: 'bg-v2-info/70' },
  base:     { label: 'BASE', dotClass: 'bg-v2-success/70' },
  arbitrum: { label: 'ARB', dotClass: 'bg-v2-warning/80' },
  optimism: { label: 'OP', dotClass: 'bg-v2-danger/70' },
}

type Props = {
  chain: ChainId
  className?: string
}

/**
 * ChainBadge — compact chain identifier chip.
 * Small colored dot + mono label. RSC-safe.
 */
export function ChainBadge({ chain, className }: Props) {
  const { label, dotClass } = CHAIN_META[chain]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-px',
        'border border-v2-border/40 bg-v2-surface font-mono text-[10px] tabular-nums text-v2-muted',
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotClass)} aria-hidden="true" />
      {label}
    </span>
  )
}
