'use client'

import { cn } from '@/lib/utils'

type Props = {
  onAddClick: () => void
  onFindClick: () => void
}

export function FloatingActionBar({ onAddClick, onFindClick }: Props) {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-1/2 -translate-x-1/2 z-10',
        'flex items-center gap-1 rounded-full border border-v2-border bg-v2-surface/95 p-1 shadow-md shadow-black/[0.06] backdrop-blur',
      )}
    >
      <button
        type="button"
        onClick={onAddClick}
        className="rounded-full bg-v2-foreground px-3 py-1.5 text-[12px] font-medium text-v2-background hover:bg-v2-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
      >
        + Add connector
      </button>
      <button
        type="button"
        onClick={onFindClick}
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11.5px] text-v2-muted transition-colors hover:bg-v2-foreground/[0.05] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
      >
        <span>Find</span>
        <kbd className="rounded border border-v2-border/80 px-1 text-[9px] font-mono text-v2-muted">⌘K</kbd>
      </button>
    </div>
  )
}
