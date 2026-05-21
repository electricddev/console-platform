import { describe, expect, it } from 'vitest'
import { computeCanvasLayout } from '@/components/v2/features/sources/hooks/use-canvas-layout'
import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

const t = '2026-05-21T10:00:00.000Z'

// New constants matching use-canvas-layout.ts
const MIN_CANVAS_WIDTH = 1100
const VAULT_W = 220
const DATASET_W = 220
const LEFT_GUTTER = 40
const RIGHT_GUTTER = 40

function fxOneConnection(): { connections: ConnectorConnection[]; datasets: ConnectionDataset[]; vaults: VaultRef[] } {
  return {
    connections: [{
      id: 'c1', connectorId: 'sec-edgar', category: 'regulator', name: 'SEC EDGAR',
      status: 'ok', lastSyncAt: t, cadence: 'continuous', datasetIds: ['d1'],
    }],
    datasets: [{
      id: 'd1', connectionId: 'c1', name: 'form_n_port', rowCount: 1, rowUnit: 'filings',
      lastSyncAt: t, vaultIds: ['v1'],
    }],
    vaults: [{ id: 'v1', symbol: 'ACRED', sponsor: 'Apollo', palette: 'forest', datasetCount: 1, consumerCount: 0 }],
  }
}

describe('computeCanvasLayout', () => {
  it('places a single source tile in the regulator lane with a category label above it', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)

    const label = layout.items.find((i) => i.kind === 'category-label')
    expect(label).toBeDefined()
    expect(label?.label).toBe('Regulator')
    expect(label?.x).toBe(40)

    const srcItem = layout.items.find((i) => i.kind === 'source-tile' && i.id === 'c1')
    expect(srcItem).toBeDefined()
    if (srcItem?.kind !== 'source-tile') throw new Error('source tile not found')
    expect(srcItem.x).toBe(40)
    expect(srcItem.w).toBe(320)
    expect(srcItem.h).toBe(56)
    expect(srcItem.y).toBeGreaterThan(label!.y) // tile is below its category label
  })

  it('places the dataset adjacent (vertically centered) to its parent source', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    const srcItem = layout.items.find((i) => i.kind === 'source-tile')
    const dsItem = layout.items.find((i) => i.kind === 'dataset-tile' && i.id === 'd1')
    if (srcItem?.kind !== 'source-tile' || dsItem?.kind !== 'dataset-tile') throw new Error('items not found')
    // Dataset x is between source right edge and vault left edge
    expect(dsItem.x).toBeGreaterThan(srcItem.x + srcItem.w)
    expect(dsItem.x + DATASET_W).toBeLessThan(MIN_CANVAS_WIDTH - RIGHT_GUTTER - VAULT_W)
    // Centers align within 4px
    expect(Math.abs((srcItem.y + srcItem.h / 2) - (dsItem.y + dsItem.h / 2))).toBeLessThan(4)
  })

  it('places the vault tile near the average y of its consumed datasets', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    const dsItem = layout.items.find((i) => i.kind === 'dataset-tile')
    const vaultItem = layout.items.find((i) => i.kind === 'vault-tile' && i.id === 'v1')
    if (dsItem?.kind !== 'dataset-tile' || vaultItem?.kind !== 'vault-tile') throw new Error('items not found')
    // Vault x = canvasWidth - RIGHT_GUTTER - VAULT_W = 1100 - 40 - 220 = 840
    expect(vaultItem.x).toBe(MIN_CANVAS_WIDTH - RIGHT_GUTTER - VAULT_W)
    expect(vaultItem.w).toBe(220)
    expect(vaultItem.h).toBe(88)
    expect(Math.abs(vaultItem.y - dsItem.y)).toBeLessThan(80)
  })

  it('emits one source-to-dataset edge and one dataset-to-vault edge with status propagated', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    expect(layout.edges).toHaveLength(2)
    expect(layout.edges[0]).toMatchObject({ kind: 'source-to-dataset', from: 'c1', to: 'd1', status: 'ok' })
    expect(layout.edges[1]).toMatchObject({ kind: 'dataset-to-vault', from: 'd1', to: 'v1', status: 'ok' })
  })

  it('orders categories per CATEGORY_ORDER and skips empty categories', () => {
    const f = fxOneConnection()
    // Add a fund-admin connection — should appear ABOVE the regulator one in the output
    f.connections.unshift({
      id: 'c0', connectorId: 'sfs', category: 'fund-admin', name: 'SFS',
      status: 'ok', lastSyncAt: t, cadence: '5min poll', datasetIds: [],
    })
    const layout = computeCanvasLayout(f)
    const labels = layout.items.filter((i) => i.kind === 'category-label')
    expect(labels.map((l) => l.label)).toEqual(['Fund admin', 'Regulator'])
    expect(labels[0].y).toBeLessThan(labels[1].y)
  })

  it('propagates attention status to source-to-dataset edge', () => {
    const f = fxOneConnection()
    f.connections[0].status = 'attention'
    const layout = computeCanvasLayout(f)
    expect(layout.edges[0].status).toBe('attention')
  })

  it('returns a width of at least 1100 and a height that grows with content', () => {
    const f = fxOneConnection()
    const layout = computeCanvasLayout(f)
    expect(layout.width).toBeGreaterThanOrEqual(1100)
    expect(layout.height).toBeGreaterThanOrEqual(200)
  })
})
