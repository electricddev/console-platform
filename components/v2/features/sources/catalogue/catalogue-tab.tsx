'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { CatalogueCard } from './catalogue-card'
import { CATALOG, CATEGORY_LABELS, CATEGORY_ORDER, type ConnectorDefinition } from '../catalog-data'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
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
        <InputGroup className="max-w-xs">
          <InputGroupAddon align="inline-start">
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search providers…"
            aria-label="Search catalogue"
          />
        </InputGroup>
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={activeCategory === null ? 'default' : 'ghost'}
            size="xs"
            onClick={() => setActiveCategory(null)}
            className="rounded-full"
          >
            All
          </Button>
          {CATEGORY_ORDER.map((cat) => (
            <Button
              key={cat}
              variant={activeCategory === cat ? 'default' : 'ghost'}
              size="xs"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className="rounded-full"
            >
              {CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-9">
        {CATEGORY_ORDER.map((cat) => {
          const items = byCategory.get(cat)
          if (!items || items.length === 0) return null
          return (
            <section key={cat}>
              <h2 className="mb-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-v2-muted/70">
                {CATEGORY_LABELS[cat]}
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
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

