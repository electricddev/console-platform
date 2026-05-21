'use client'

import { useMemo } from 'react'
import type { CanvasEdge, CanvasItem } from './hooks/use-canvas-layout'

const EDGE_GUTTER = 30  // horizontal "C" curve gutter

type Props = {
  edges: readonly CanvasEdge[]
  items: readonly CanvasItem[]
  width: number
  height: number
  highlightedTileId?: string | null
}

export function CanvasEdges({ edges, items, width, height, highlightedTileId }: Props) {
  const paths = useMemo(() => {
    const itemById = new Map<string, CanvasItem>()
    for (const i of items) itemById.set(i.id, i)
    return edges.flatMap((edge, idx) => {
      const from = itemById.get(edge.from)
      const to = itemById.get(edge.to)
      if (!from || !to || !('w' in from) || !('w' in to)) return []
      const x1 = from.x + from.w
      const y1 = from.y + from.h / 2
      const x2 = to.x
      const y2 = to.y + to.h / 2
      const c1x = x1 + EDGE_GUTTER
      const c2x = x2 - EDGE_GUTTER
      const d = `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`
      const highlighted =
        highlightedTileId === edge.from || highlightedTileId === edge.to
      const stroke =
        edge.status === 'attention' || edge.status === 'error'
          ? 'url(#edge-warn)'
          : 'url(#edge-base)'
      return [{
        key: `${edge.kind}-${edge.from}-${edge.to}-${idx}`,
        d,
        stroke,
        opacity: highlighted ? 1 : (highlightedTileId ? 0.25 : 1),
        strokeWidth: highlighted ? 1.5 : 1,
      }]
    })
  }, [edges, items, highlightedTileId])

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="edge-base" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--v2-muted)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--v2-muted)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--v2-muted)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="edge-warn" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="oklch(0.70 0.14 70)" stopOpacity="0" />
          <stop offset="0.5" stopColor="oklch(0.70 0.14 70)" stopOpacity="0.6" />
          <stop offset="1" stopColor="oklch(0.70 0.14 70)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          stroke={p.stroke}
          strokeWidth={p.strokeWidth}
          fill="none"
          opacity={p.opacity}
          style={{ transition: 'opacity 180ms, stroke-width 180ms' }}
        />
      ))}
    </svg>
  )
}
