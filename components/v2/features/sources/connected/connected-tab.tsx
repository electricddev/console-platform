'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { ConnectionRow } from './connection-row'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { cn } from '@/lib/utils'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Badge } from '@/components/ui/badge'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  onRowClick?: (connectionId: string) => void
}

export function ConnectedTab({ connections, datasets, onRowClick }: Props) {
  const [query, setQuery] = useState('')

  const datasetsByConn = useMemo(() => {
    const map = new Map<string, ConnectionDataset[]>()
    for (const d of datasets) {
      const arr = map.get(d.connectionId) ?? []
      arr.push(d)
      map.set(d.connectionId, arr)
    }
    return map
  }, [datasets])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return connections
    return connections.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.subtitle?.toLowerCase().includes(q) ?? false),
    )
  }, [connections, query])

  if (connections.length === 0) {
    return (
      <div className="rounded-lg border border-v2-border/60 bg-v2-surface/30 px-10 py-14 text-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-v2-muted/70 mb-3">Sources</div>
        <h2 className="font-serif text-[22px] text-v2-foreground">No sources connected yet.</h2>
        <p className="mt-1 text-[12.5px] text-v2-muted">Start with one of these — or browse the full catalogue.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {['stripe', 'plaid', 's3', 'sec-edgar'].map((id) => {
            const def = connectorById(id)
            return (
              <button
                key={id}
                type="button"
                onClick={() => onRowClick?.(`__add:${id}`)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] text-v2-foreground hover:bg-v2-foreground/[0.04] transition-colors duration-150',
                )}
              >
                {def?.logo.kind === 'wordmark' ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-5 items-center justify-center rounded text-[8px] font-semibold font-mono',
                      WORDMARK_TONES[def.logo.tone],
                    )}
                  >
                    {def.logo.label}
                  </span>
                ) : null}
                <span>{id === 'sec-edgar' ? 'SEC EDGAR' : id[0].toUpperCase() + id.slice(1)}</span>
              </button>
            )
          })}
        </div>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => onRowClick?.('__browse')}
            className="text-[12px] text-v2-muted underline-offset-2 hover:underline hover:text-v2-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
          >
            Browse catalogue →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <InputGroup className="max-w-xs">
          <InputGroupAddon align="inline-start">
            <Search className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources…"
            aria-label="Search sources"
          />
        </InputGroup>
        <Badge variant="outline" className="ml-auto font-mono">{filtered.length} of {connections.length}</Badge>
      </div>
      <ul className="flex flex-col divide-y divide-v2-border/50">
        {filtered.map((c) => (
          <li key={c.id}>
            <ConnectionRow
              connection={c}
              datasets={datasetsByConn.get(c.id) ?? []}
              onClick={() => onRowClick?.(c.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
