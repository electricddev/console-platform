import { useMemo } from 'react'
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '@/components/v2/features/sources/catalog-data'
import type {
  ConnectorConnection,
  ConnectionDataset,
  ConnectorCategory,
  VaultRef,
} from '@/lib/api/schemas'

export type CanvasItem =
  | { kind: 'source-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'dataset-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'vault-tile'; id: string; x: number; y: number; w: number; h: number }
  | { kind: 'category-label'; id: string; x: number; y: number; label: string }

export type CanvasEdge =
  | { kind: 'source-to-dataset'; from: string; to: string; status: ConnectorConnection['status'] }
  | { kind: 'dataset-to-vault'; from: string; to: string; status: ConnectorConnection['status'] }

export type CanvasLayout = {
  items: CanvasItem[]
  edges: CanvasEdge[]
  width: number
  height: number
}

export type LayoutInput = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  vaults: readonly VaultRef[]
}

const CANVAS_WIDTH = 920
const LANE_SOURCE_X = 36
const LANE_DATASET_X = 380
const LANE_VAULT_X = 720
const SOURCE_W = 260
const SOURCE_H = 50
const DATASET_W = 175
const DATASET_H = 36
const VAULT_W = 175
const VAULT_H = 80
const CATEGORY_TOP_PADDING = 36
const CATEGORY_LABEL_HEIGHT = 20
const TILE_GAP_WITHIN_CATEGORY = 8
const DATASET_GAP = 6
const CANVAS_TOP_PADDING = 44

export function computeCanvasLayout(input: LayoutInput): CanvasLayout {
  const { connections, datasets, vaults } = input
  const items: CanvasItem[] = []
  const edges: CanvasEdge[] = []

  // Group connections by category
  const byCategory = new Map<ConnectorCategory, ConnectorConnection[]>()
  for (const c of connections) {
    const existing = byCategory.get(c.category) ?? []
    existing.push(c)
    byCategory.set(c.category, existing)
  }

  // Track source y centers (after placement) for dataset alignment
  const sourceCenters = new Map<string, number>()

  // Place sources lane top-down
  let y = CANVAS_TOP_PADDING
  for (const cat of CATEGORY_ORDER) {
    const conns = byCategory.get(cat)
    if (!conns || conns.length === 0) continue
    const sorted = [...conns].sort((a, b) => a.name.localeCompare(b.name))

    items.push({
      kind: 'category-label',
      id: `cat-${cat}`,
      x: LANE_SOURCE_X,
      y,
      label: CATEGORY_LABELS[cat],
    })
    y += CATEGORY_LABEL_HEIGHT

    for (const c of sorted) {
      items.push({
        kind: 'source-tile',
        id: c.id,
        x: LANE_SOURCE_X,
        y,
        w: SOURCE_W,
        h: SOURCE_H,
      })
      sourceCenters.set(c.id, y + SOURCE_H / 2)
      y += SOURCE_H + TILE_GAP_WITHIN_CATEGORY
    }

    y += CATEGORY_TOP_PADDING - TILE_GAP_WITHIN_CATEGORY
  }

  // Place datasets adjacent to their parent source
  for (const c of connections) {
    const center = sourceCenters.get(c.id)
    if (center === undefined) continue
    const myDatasets = datasets.filter((d) => d.connectionId === c.id)
    if (myDatasets.length === 0) continue
    const stackHeight = myDatasets.length * DATASET_H + (myDatasets.length - 1) * DATASET_GAP
    let dy = center - stackHeight / 2
    for (const d of myDatasets) {
      items.push({
        kind: 'dataset-tile',
        id: d.id,
        x: LANE_DATASET_X,
        y: dy,
        w: DATASET_W,
        h: DATASET_H,
      })
      edges.push({ kind: 'source-to-dataset', from: c.id, to: d.id, status: c.status })
      dy += DATASET_H + DATASET_GAP
    }
  }

  // Place vaults: y = average y of consumed datasets
  const datasetItemById = new Map(
    items.filter((i): i is Extract<CanvasItem, { kind: 'dataset-tile' }> => i.kind === 'dataset-tile')
      .map((i) => [i.id, i] as const),
  )
  for (const v of vaults) {
    const consumed = datasets.filter((d) => d.vaultIds.includes(v.id))
    const centers: number[] = []
    for (const d of consumed) {
      const item = datasetItemById.get(d.id)
      if (item) centers.push(item.y + item.h / 2)
    }
    const avgCenter =
      centers.length > 0
        ? centers.reduce((a, b) => a + b, 0) / centers.length
        : CANVAS_TOP_PADDING + VAULT_H
    const vy = Math.max(CANVAS_TOP_PADDING, avgCenter - VAULT_H / 2)
    items.push({ kind: 'vault-tile', id: v.id, x: LANE_VAULT_X, y: vy, w: VAULT_W, h: VAULT_H })

    for (const d of consumed) {
      const sourceConn = connections.find((c) => c.id === d.connectionId)
      edges.push({
        kind: 'dataset-to-vault',
        from: d.id,
        to: v.id,
        status: sourceConn?.status ?? 'ok',
      })
    }
  }

  const maxItemBottom = items.reduce((m, i) => {
    const bottom = 'h' in i ? i.y + (i as { h: number }).h : i.y + CATEGORY_LABEL_HEIGHT
    return Math.max(m, bottom)
  }, 0)
  const height = Math.max(200, maxItemBottom + 40)

  return { items, edges, width: CANVAS_WIDTH, height }
}

export function useCanvasLayout(input: LayoutInput): CanvasLayout {
  return useMemo(() => computeCanvasLayout(input), [input])
}
