'use client'

import { useMemo, useState } from 'react'
import { CatalogueCard } from './catalogue-card'
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, type ConnectorDefinition } from '../catalog-data'
import { cn } from '@/lib/utils'
import type { ConnectorConnection } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  onPick?: (connectorId: string) => void
  onAlreadyConnected?: (connectorId: string) => void
}

export function CatalogueTab({ connections, onPick, onAlreadyConnected }: Props) {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const connectedCountByConnector = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of connections) map.set(c.connectorId, (map.get(c.connectorId) ?? 0) + 1)
    return map
  }, [connections])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return CATALOG.filter((c) => {
      if (activeCategory && c.category !== activeCategory) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [query, activeCategory])

  const byCategory = useMemo(() => {
    const map = new Map<string, ConnectorDefinition[]>()
    for (const c of visible) {
      const arr = map.get(c.category) ?? []
      arr.push(c)
      map.set(c.category, arr)
    }
    return map
  }, [visible])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search providers…"
          aria-label="Search catalogue"
          className="w-full max-w-xs rounded-md border border-v2-border bg-v2-surface px-3 py-1.5 text-[12.5px] placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
        />
        <div className="flex flex-wrap gap-1.5">
          <FilterChip label="All" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
          {CATEGORY_ORDER.map((cat) => (
            <FilterChip
              key={cat}
              label={CATEGORY_LABELS[cat]}
              active={activeCategory === cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-7">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory.get(cat)
          if (!items || items.length === 0) return null
          return (
            <section key={cat}>
              <h2 className="mb-2 text-[10.5px] font-medium uppercase tracking-[0.14em] text-v2-muted">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
                {items.map((def) => {
                  const connected = connectedCountByConnector.get(def.id) ?? 0
                  const badge = connected > 0
                    ? { kind: 'connected' as const, count: connected }
                    : def.wired === 'soon'
                      ? { kind: 'soon' as const }
                      : { kind: 'none' as const }
                  return (
                    <CatalogueCard
                      key={def.id}
                      def={def}
                      badge={badge}
                      onClick={() => {
                        if (badge.kind === 'connected') onAlreadyConnected?.(def.id)
                        else if (def.wired === 'wired') onPick?.(def.id)
                        else { /* Coming soon — toast handled in Task 16 */ onPick?.(`__soon:${def.id}`) }
                      }}
                    />
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1 text-[11.5px] transition-colors',
        active
          ? 'border-v2-foreground bg-v2-foreground text-v2-background'
          : 'border-v2-border text-v2-muted hover:text-v2-foreground hover:border-v2-foreground/40',
      )}
    >
      {label}
    </button>
  )
}
