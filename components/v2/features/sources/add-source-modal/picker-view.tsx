'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
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
    <div className="flex flex-col gap-4 px-1 pt-1">
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
      <div className="flex flex-col gap-4">
        {CATEGORY_ORDER.map((cat) => {
          const items = visible.filter((c) => c.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="grid grid-cols-3 gap-1.5 md:grid-cols-4">
                {items.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    onClick={() => onPick(def.id)}
                    className={cn(
                      'flex h-20 flex-col items-center justify-center gap-1 rounded-md border border-v2-border bg-v2-surface px-2 text-center transition-[border-color,transform] duration-200 hover:translate-y-[-1px] hover:border-v2-foreground/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
                    )}
                  >
                    {def.logo.kind === 'wordmark' ? (
                      <span
                        className={cn(
                          'flex size-7 items-center justify-center rounded-md font-mono text-[10px] font-semibold',
                          WORDMARK_TONES[def.logo.tone],
                        )}
                      >
                        {def.logo.label}
                      </span>
                    ) : (
                      <span className="flex size-7 items-center justify-center rounded-md bg-v2-surface-2">
                        <def.logo.Icon
                          className="size-3.5 text-v2-muted"
                          strokeWidth={1.75}
                        />
                      </span>
                    )}
                    <span className="truncate text-[11px] text-v2-foreground">
                      {def.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
