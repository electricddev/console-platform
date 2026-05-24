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
    return null /* empty state is Task 10 */
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
