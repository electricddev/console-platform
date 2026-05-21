'use client'

import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from './catalog-data'

const QUICK_PICKS = ['sfs', 's3', 'sec-edgar', 'file-upload'] as const

type Props = {
  onPick: (connectorId: string) => void
  onBrowse: () => void
}

export function EmptyState({ onPick, onBrowse }: Props) {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-v2-foreground">Connect your first data source</h2>
        <p className="mt-1 text-sm text-v2-muted">Pick one to get started, or browse the catalog.</p>
      </div>
      <div className="flex gap-2">
        {QUICK_PICKS.map((id) => {
          const def = connectorById(id)
          if (!def) return null
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-3 py-2 text-sm text-v2-foreground transition-colors',
                'hover:border-v2-foreground/30',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
              )}
            >
              {def.logo.kind === 'wordmark' ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-6 items-center justify-center rounded font-mono text-[10px] font-semibold',
                    WORDMARK_TONES[def.logo.tone],
                  )}
                >
                  {def.logo.label}
                </span>
              ) : null}
              <span>{def.name}</span>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        onClick={onBrowse}
        className="text-[12px] text-v2-muted underline-offset-2 hover:text-v2-foreground hover:underline"
      >
        Browse the catalog →
      </button>
    </div>
  )
}
