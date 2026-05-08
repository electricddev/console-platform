'use client'

import 'reactflow/dist/style.css'
import ReactFlow, { Background, Controls, MarkerType, type Edge as RfEdge, type Node as RfNode } from 'reactflow'
import { useMemo } from 'react'
import type { Lineage } from '@/lib/api/endpoints/datasets'

const KIND_COLOR: Record<string, string> = {
  source: 'oklch(0.65 0.05 256)',
  agent: 'oklch(0.78 0.07 256)',
  storage: 'oklch(0.50 0.04 256)',
  enclave: 'oklch(0.62 0.13 145)',
  output: 'oklch(0.78 0.14 80)',
}

export function FullLineageGraph({ lineage }: { lineage: Lineage }) {
  const nodes: RfNode[] = useMemo(() =>
    lineage.nodes.map((n, i) => ({
      id: n.id,
      position: { x: i * 220, y: 0 },
      data: { label: <div><div className="font-tag text-[0.65rem] text-muted-foreground">{n.kind}</div><div className="text-sm font-medium">{n.label}</div></div> },
      style: { background: 'var(--surface)', border: `1.5px solid ${KIND_COLOR[n.kind] ?? 'var(--border)'}`, padding: 12, borderRadius: 8, minWidth: 160 },
    })), [lineage])

  const edges: RfEdge[] = useMemo(() =>
    lineage.edges.map((e, i) => ({
      id: `e_${i}`,
      source: e.from,
      target: e.to,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: 'var(--border)' },
    })), [lineage])

  return (
    <div className="h-[28rem] rounded-lg border border-border bg-surface/40">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background gap={24} />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  )
}
