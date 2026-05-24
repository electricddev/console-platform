'use client'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
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
        'group flex h-[112px] w-full flex-col rounded-lg border border-v2-border p-4 text-left',
        'transition-[transform,box-shadow,border-color] duration-200',
        'hover:translate-y-[-1px] hover:border-v2-foreground/30 hover:shadow-[0_4px_24px_-12px_rgba(0,0,0,0.4)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        badge.kind === 'soon' ? 'bg-v2-surface/40 opacity-70' : 'bg-v2-surface',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-medium tracking-tight text-v2-foreground">{def.name}</div>
          <div className="mt-0.5 truncate text-[11px] text-v2-muted">{def.tagline}</div>
        </div>
        {badge.kind === 'connected' && (
          <Badge variant="secondary" className="shrink-0 gap-1.5 font-mono text-[10px]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-v2-green" />
            {badge.count}
          </Badge>
        )}
        {badge.kind === 'soon' && (
          <Badge variant="outline" className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em]">Coming soon</Badge>
        )}
      </div>
      <div className="mt-auto flex items-end justify-between">
        {def.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn('flex size-8 items-center justify-center rounded-md font-mono text-[10px] font-semibold', WORDMARK_TONES[def.logo.tone])}
          >
            {def.logo.label}
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-md bg-v2-surface-2">
            <def.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.75} />
          </span>
        )}
      </div>
    </button>
  )
}
