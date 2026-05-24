'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, WORDMARK_TONES } from '../catalog-data'

type Props = { onPick: (connectorId: string) => void }

export function PickerView({ onPick }: Props) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter(
      (c) => (!q || c.name.toLowerCase().includes(q)) && c.wired === 'wired',
    )
  }, [query])

  return (
    <div className="flex flex-col gap-5">
      <InputGroup>
        <InputGroupAddon align="inline-start">
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          placeholder="Search providers…"
          aria-label="Search providers"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </InputGroup>

      <div className="flex flex-col gap-5">
        {CATEGORY_ORDER.map((cat) => {
          const items = visible.filter((c) => c.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat}>
              <h3 className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">
                {CATEGORY_LABELS[cat]}
              </h3>
              <ul className="flex flex-col">
                {items.map((def) => (
                  <li key={def.id}>
                    <button
                      type="button"
                      onClick={() => onPick(def.id)}
                      className={cn(
                        'group flex w-full items-center gap-3.5 rounded-md px-2 py-2.5 text-left transition-colors',
                        'hover:bg-v2-foreground/[0.04]',
                        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
                      )}
                    >
                      {def.logo.kind === 'wordmark' ? (
                        <span
                          aria-hidden="true"
                          className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold',
                            WORDMARK_TONES[def.logo.tone],
                          )}
                        >
                          {def.logo.label}
                        </span>
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-v2-surface-2">
                          <def.logo.Icon
                            className="size-4 text-v2-muted"
                            strokeWidth={1.75}
                          />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium tracking-tight text-v2-foreground">
                          {def.name}
                        </div>
                        <div className="mt-0.5 truncate text-[11.5px] text-v2-muted">
                          {def.tagline}
                        </div>
                      </div>
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 shrink-0 text-v2-muted/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {visible.length === 0 && (
          <div className="rounded-md border border-dashed border-v2-border/60 px-4 py-8 text-center text-[12.5px] text-v2-muted">
            No providers match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  )
}
