'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  CATALOG,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  WORDMARK_TONES,
  type ConnectorDefinition,
} from './catalog-data'

type Props = {
  open: boolean
  onClose: () => void
  onPick: (connectorId: string) => void
}

export function CatalogSheet({ open, onClose, onPick }: Props) {
  const [activeCategory, setActiveCategory] = useState(CATEGORY_ORDER[0])
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
      return () => cancelAnimationFrame(id)
    }
  }, [open])

  const sheetInitial = reducedMotion ? { opacity: 0 } : { y: '100%' }
  const sheetAnimate = reducedMotion ? { opacity: 1 } : { y: 0 }
  const sheetExit = reducedMotion ? { opacity: 0 } : { y: '100%' }
  const sheetTransition = reducedMotion
    ? { duration: 0.15 }
    : { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] as const }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-v2-background/55 backdrop-blur-sm"
            aria-hidden="true"
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Add a connector"
            initial={sheetInitial}
            animate={sheetAnimate}
            exit={sheetExit}
            transition={sheetTransition}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
            className="fixed inset-x-0 bottom-0 z-50 max-h-[55vh] overflow-hidden rounded-t-3xl border-t border-v2-border bg-v2-surface shadow-2xl shadow-black/20"
          >
            <header className="flex items-end justify-between gap-4 border-b border-v2-border/60 px-6 pb-4 pt-5">
              <div>
                <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-v2-muted/65">// catalog</p>
                <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-v2-foreground">
                  Pick a connector
                </h2>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close catalog"
                className="rounded-md px-2 py-1 text-xs text-v2-muted hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
              >
                Esc
              </button>
            </header>

            <nav className="flex gap-1 overflow-x-auto border-b border-v2-border/40 px-6 py-2" aria-label="Categories">
              {CATEGORY_ORDER.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  aria-pressed={activeCategory === cat}
                  className={cn(
                    'shrink-0 rounded-md px-3 py-1.5 text-[12px] transition-colors',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
                    activeCategory === cat
                      ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                      : 'text-v2-muted hover:text-v2-foreground',
                  )}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </nav>

            <div className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(55vh - 130px)' }}>
              <ul className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                {CATALOG.filter((c) => c.category === activeCategory).map((c) => (
                  <CatalogCard
                    key={c.id}
                    def={c}
                    onPick={() => { if (c.wired === 'wired') onPick(c.id) }}
                  />
                ))}
              </ul>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

function CatalogCard({ def, onPick }: { def: ConnectorDefinition; onPick: () => void }) {
  const disabled = def.wired === 'soon'
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        disabled={disabled}
        aria-label={disabled ? `${def.name} — coming soon` : `Connect ${def.name}`}
        className={cn(
          'group flex h-full w-full items-center gap-2.5 rounded-lg border border-v2-border bg-v2-surface px-3 py-2.5 text-left transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
          disabled
            ? 'cursor-not-allowed opacity-50'
            : 'hover:border-v2-foreground/30 hover:bg-v2-foreground/[0.03]',
        )}
      >
        {def.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-8 items-center justify-center rounded-md font-mono text-[11px] font-semibold',
              WORDMARK_TONES[def.logo.tone],
            )}
          >
            {def.logo.label}
          </span>
        ) : (
          <span className="flex size-8 items-center justify-center rounded-md border border-v2-border bg-v2-surface">
            <def.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.6} aria-hidden="true" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">{def.name}</span>
            {disabled ? (
              <span className="font-mono text-[9px] uppercase tracking-wider text-v2-muted/70">Soon</span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-[10.5px] text-v2-muted">{def.tagline}</p>
        </div>
      </button>
    </li>
  )
}
