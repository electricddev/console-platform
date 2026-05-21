'use client'

import { useReducer } from 'react'
import { useCanvasLayout } from './hooks/use-canvas-layout'
import { SourceTile } from './source-tile'
import { DatasetTile } from './dataset-tile'
import { VaultPeripheralTile } from './vault-peripheral-tile'
import { CategoryLabel } from './category-lane'
import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

type CanvasState = { selectedTileId: string | null }
type CanvasAction = { type: 'select'; id: string } | { type: 'deselect' }

function reducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedTileId: action.id }
    case 'deselect':
      return { ...state, selectedTileId: null }
  }
}

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  vaults: readonly VaultRef[]
}

export function SourcesCanvas({ connections, datasets, vaults }: Props) {
  const layout = useCanvasLayout({ connections, datasets, vaults })
  const [state, dispatch] = useReducer(reducer, { selectedTileId: null })

  const connectionById = new Map(connections.map((c) => [c.id, c]))
  const datasetById = new Map(datasets.map((d) => [d.id, d]))
  const vaultById = new Map(vaults.map((v) => [v.id, v]))
  const datasetCountByConn = new Map<string, number>()
  for (const d of datasets) {
    datasetCountByConn.set(d.connectionId, (datasetCountByConn.get(d.connectionId) ?? 0) + 1)
  }

  return (
    <div className="px-8 pt-6 pb-12">
      <header className="flex items-end justify-between gap-6 border-b border-v2-border/60 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
            {'// pipeline · sources'}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-v2-foreground">
            Connections
          </h1>
          <p className="mt-1 max-w-prose text-sm text-v2-muted">
            {connections.length} sources feeding {datasets.length} datasets into {vaults.length} data vaults.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-v2-foreground px-4 py-2 text-sm font-medium text-v2-background hover:bg-v2-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          + Add connector
        </button>
      </header>

      {/* Canvas */}
      <div
        className="relative mt-6 overflow-hidden rounded-2xl border border-v2-border/60 bg-v2-surface/40"
        style={{ height: layout.height, width: '100%' }}
        aria-label="Connections canvas"
        role="region"
        onClick={(e) => {
          if (e.target === e.currentTarget) dispatch({ type: 'deselect' })
        }}
      >
        {/* Dotted background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, color-mix(in oklch, var(--v2-foreground) 7%, transparent) 1px, transparent 1.5px)',
            backgroundSize: '18px 18px',
          }}
        />

        {/* Items */}
        {layout.items.map((item) => {
          if (item.kind === 'category-label') {
            return <CategoryLabel key={item.id} x={item.x} y={item.y} label={item.label} />
          }
          const style = { left: item.x, top: item.y, width: item.w, height: item.h }
          if (item.kind === 'source-tile') {
            const conn = connectionById.get(item.id)
            if (!conn) return null
            return (
              <div key={item.id} className="absolute" style={style}>
                <SourceTile
                  connection={conn}
                  datasetCount={datasetCountByConn.get(conn.id) ?? 0}
                  selected={state.selectedTileId === conn.id}
                  onSelect={() => dispatch({ type: 'select', id: conn.id })}
                />
              </div>
            )
          }
          if (item.kind === 'dataset-tile') {
            const ds = datasetById.get(item.id)
            if (!ds) return null
            return (
              <div key={item.id} className="absolute" style={style}>
                <DatasetTile dataset={ds} />
              </div>
            )
          }
          if (item.kind === 'vault-tile') {
            const v = vaultById.get(item.id)
            if (!v) return null
            return (
              <div key={item.id} className="absolute" style={style}>
                <VaultPeripheralTile vault={v} />
              </div>
            )
          }
          return null
        })}
      </div>
    </div>
  )
}
