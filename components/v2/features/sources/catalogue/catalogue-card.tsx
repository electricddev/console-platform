'use client'

import { cn } from '@/lib/utils'
import { WORDMARK_TONES, type ConnectorDefinition } from '../catalog-data'

type Badge =
  | { kind: 'none' }
  | { kind: 'soon' }
  | { kind: 'connected'; count: number }

type Props = {
  def: ConnectorDefinition
  badge: Badge
  onClick: () => void
}

export function CatalogueCard({ def, badge, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${def.name} — ${badge.kind === 'connected' ? `${badge.count} connected` : badge.kind === 'soon' ? 'Coming soon' : 'Add'}`}
      className={cn(
        'group flex h-[112px] w-full flex-col justify-between rounded-lg border border-v2-border bg-v2-surface p-3 text-left transition-colors',
        'hover:border-v2-foreground/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        badge.kind === 'soon' && 'opacity-70',
      )}
    >
      <div className="flex items-start justify-between">
        {def.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn('flex size-10 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}
          >
            {def.logo.label}
          </span>
        ) : (
          <span className="flex size-10 items-center justify-center rounded-md bg-v2-surface-2">
            <def.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} />
          </span>
        )}
        {badge.kind === 'connected' && (
          <span className="rounded-full bg-[oklch(0.55_0.10_150)]/15 px-2 py-0.5 text-[10.5px] font-medium text-[oklch(0.40_0.10_150)]">
            Connected · {badge.count}
          </span>
        )}
        {badge.kind === 'soon' && (
          <span className="rounded-full bg-v2-foreground/[0.06] px-2 py-0.5 text-[10.5px] font-medium text-v2-muted">
            Coming soon
          </span>
        )}
      </div>
      <div>
        <div className="text-[13px] font-medium text-v2-foreground">{def.name}</div>
        <div className="mt-0.5 truncate text-[11px] text-v2-muted">{def.tagline}</div>
      </div>
    </button>
  )
}
