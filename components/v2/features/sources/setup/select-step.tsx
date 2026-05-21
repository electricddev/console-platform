'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveredDataset } from './setup-reducer'

type Props = {
  discovered: DiscoveredDataset[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  onConfirm: () => void
  onCancel: () => void
  submitting?: boolean
}

export function SelectStep({ discovered, selectedIds, onToggle, onToggleAll, onConfirm, onCancel, submitting }: Props) {
  const allSelected = selectedIds.length === discovered.length
  const noneSelected = selectedIds.length === 0
  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <p className="text-[11px] text-v2-muted">
          <span className="font-medium text-v2-foreground">{selectedIds.length}</span> of {discovered.length} selected
        </p>
        <button
          type="button"
          onClick={onToggleAll}
          className="text-[11px] text-v2-muted underline-offset-2 hover:text-v2-foreground hover:underline"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </header>
      <ul className="grid gap-1.5">
        {discovered.map((d) => {
          const checked = selectedIds.includes(d.id)
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => onToggle(d.id)}
                aria-pressed={checked}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
                  checked ? 'border-v2-foreground/30 bg-v2-foreground/[0.03]' : 'border-v2-border hover:border-v2-foreground/20',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate text-[12.5px] font-medium text-v2-foreground">{d.name}</div>
                  {d.subtitle ? <div className="mt-0.5 truncate text-[10.5px] text-v2-muted">{d.subtitle}</div> : null}
                </div>
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                    checked ? 'border-v2-foreground bg-v2-foreground text-v2-background' : 'border-v2-border bg-v2-surface',
                  )}
                >
                  {checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={noneSelected || submitting}
          className={cn(
            'rounded-md border px-3 py-1.5 text-[12px]',
            noneSelected || submitting
              ? 'cursor-not-allowed border-v2-border bg-v2-surface-2 text-v2-muted'
              : 'border-v2-foreground bg-v2-foreground text-v2-background hover:bg-v2-foreground/90',
          )}
        >
          {submitting
            ? 'Connecting…'
            : noneSelected
              ? 'Select datasets'
              : `Ingest ${selectedIds.length} dataset${selectedIds.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
