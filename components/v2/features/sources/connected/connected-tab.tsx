'use client'

import { useMemo, useState } from 'react'
import { ConnectionRow } from './connection-row'
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
      <div className="rounded-lg border border-dashed border-v2-border/80 bg-v2-surface/30 px-8 py-12 text-center">
        <h2 className="font-serif text-[20px] text-v2-foreground">No sources connected yet.</h2>
        <p className="mt-1 text-[12.5px] text-v2-muted">Start with one of these — or browse the full catalogue.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {['stripe', 'plaid', 's3', 'sec-edgar'].map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onRowClick?.(`__add:${id}`)}
              className="rounded-md border border-v2-border bg-v2-surface px-3 py-1.5 text-[12px] text-v2-foreground hover:border-v2-foreground/40"
            >
              {id === 'sec-edgar' ? 'SEC EDGAR' : id[0].toUpperCase() + id.slice(1)}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onRowClick?.('__browse')}
            className="rounded-md px-3 py-1.5 text-[12px] text-v2-muted underline-offset-2 hover:underline"
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
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sources…"
          aria-label="Search sources"
          className="w-full max-w-xs rounded-md border border-v2-border bg-v2-surface px-3 py-1.5 text-[12.5px] placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
        />
        <span className="ml-auto text-[11px] text-v2-muted">{filtered.length} of {connections.length}</span>
      </div>
      <ul className="flex flex-col divide-y divide-v2-border/60 rounded-lg border border-v2-border/60 bg-v2-surface/40">
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
