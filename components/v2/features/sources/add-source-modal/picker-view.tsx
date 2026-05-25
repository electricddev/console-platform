'use client'

import { useMemo, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, WORDMARK_TONES } from '../catalog-data'

type Props = { onPick: (connectorId: string) => void }

// Provider → auth method (small affordance on the right of the row)
const OAUTH_IDS = new Set(['stripe', 'plaid', 'quickbooks', 'xero'])
const PUBLIC_IDS = new Set(['sec-edgar'])
function authMethod(id: string): 'OAuth' | 'API key' | 'Public' | 'Upload' {
  if (id === 'file-upload') return 'Upload'
  if (PUBLIC_IDS.has(id)) return 'Public'
  if (OAUTH_IDS.has(id)) return 'OAuth'
  return 'API key'
}

export function PickerView({ onPick }: Props) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter(
      (c) => (!q || c.name.toLowerCase().includes(q)) && c.wired === 'wired',
    )
  }, [query])

  return (
    <div className="flex flex-col gap-6">
      {/* ── Search field ─────────────────────────────────────────── */}
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-v2-muted/60"
          strokeWidth={1.75}
        />
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          type="text"
          placeholder="Search providers"
          aria-label="Search providers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            'h-11 w-full rounded-[10px] bg-v2-surface-2/50 pl-10 pr-16 text-[13.5px] text-v2-foreground placeholder:text-v2-muted/55',
            'border border-v2-border/70 transition-[border,box-shadow,background]',
            'hover:bg-v2-surface-2/70',
            'focus:bg-v2-surface focus:border-v2-foreground/30 focus:outline-none focus:ring-4 focus:ring-v2-foreground/[0.05]',
          )}
        />
        <kbd
          aria-hidden="true"
          className="absolute top-1/2 right-3 -translate-y-1/2 inline-flex items-center gap-0.5 rounded-md border border-v2-border/70 bg-v2-surface px-1.5 py-0.5 font-mono text-[10px] font-medium leading-none text-v2-muted/70 shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:shadow-none"
        >
          /
        </kbd>
      </div>

      {/* ── Category sections ────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {CATEGORY_ORDER.map((cat) => {
          const items = visible.filter((c) => c.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat}>
              {/* Category header — label + hairline */}
              <div className="mb-2.5 flex items-center gap-3">
                <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">
                  {CATEGORY_LABELS[cat]}
                </h3>
                <div className="flex-1 h-px bg-gradient-to-r from-v2-border/60 to-transparent" />
                <span className="font-mono text-[10px] text-v2-muted/50">
                  {items.length}
                </span>
              </div>

              {/* Provider rows */}
              <ul className="flex flex-col gap-1">
                {items.map((def) => {
                  const auth = authMethod(def.id)
                  return (
                    <li key={def.id}>
                      <button
                        type="button"
                        onClick={() => onPick(def.id)}
                        className={cn(
                          'group relative flex w-full items-center gap-4 rounded-xl px-3 py-3 text-left',
                          'border border-transparent ring-1 ring-transparent',
                          'transition-all duration-150 ease-out',
                          'hover:border-v2-border hover:bg-v2-surface-2/55 hover:ring-v2-border/40',
                          'focus-visible:outline-none focus-visible:border-v2-foreground/30 focus-visible:ring-v2-foreground/15 focus-visible:bg-v2-surface-2/55',
                        )}
                      >
                        {/* Logo */}
                        {def.logo.kind === 'wordmark' ? (
                          <span
                            aria-hidden="true"
                            className={cn(
                              'flex size-10 shrink-0 items-center justify-center rounded-[8px] font-mono text-[11.5px] font-semibold',
                              'shadow-[inset_0_1px_0_rgba(255,255,255,0.08),_0_1px_2px_rgba(0,0,0,0.10)]',
                              WORDMARK_TONES[def.logo.tone],
                            )}
                          >
                            {def.logo.label}
                          </span>
                        ) : (
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-v2-surface-2 ring-1 ring-v2-border/60">
                            <def.logo.Icon
                              className="size-[18px] text-v2-foreground/75"
                              strokeWidth={1.6}
                            />
                          </span>
                        )}

                        {/* Name + tagline */}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13.5px] font-medium tracking-tight text-v2-foreground">
                            {def.name}
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-v2-muted">
                            {def.tagline}
                          </div>
                        </div>

                        {/* Auth-method pill */}
                        <span
                          className={cn(
                            'shrink-0 inline-flex items-center rounded-md border px-1.5 py-[3px] font-mono text-[9.5px] font-medium uppercase tracking-[0.08em] leading-none',
                            'border-v2-border/60 bg-v2-surface-2/40 text-v2-muted',
                            'transition-colors duration-150',
                            'group-hover:border-v2-border group-hover:text-v2-foreground/85',
                          )}
                        >
                          {auth}
                        </span>

                        {/* Arrow indicator */}
                        <ArrowRight
                          aria-hidden="true"
                          className="size-4 shrink-0 text-v2-muted/40 transition-all duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-v2-foreground/70"
                          strokeWidth={1.5}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}

        {visible.length === 0 && (
          <div className="rounded-xl border border-dashed border-v2-border/60 px-4 py-12 text-center">
            <p className="text-[13px] text-v2-foreground">
              No providers match &ldquo;{query}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => setQuery('')}
              className="mt-1.5 font-mono text-[11px] text-v2-muted underline-offset-2 hover:text-v2-foreground hover:underline"
            >
              Clear search
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
