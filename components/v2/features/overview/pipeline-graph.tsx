'use client'

import { useCallback, useMemo } from 'react'
import ReactFlow, {
  MarkerType,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type NodeTypes,
  type ReactFlowProps,
} from 'reactflow'
import 'reactflow/dist/base.css'
import { PipelineNodeCard } from './pipeline-node'
import type {
  PipelineFixture,
  PipelineNodeData,
  PipelinePhase,
} from './pipeline-types'

interface PipelineGraphProps {
  pipeline: PipelineFixture
  selectedId: string | null
  onSelect: (id: string | null) => void
}

// Column x-coordinates per phase. Tuned for 180px-wide cards.
const PHASE_X: Record<PipelinePhase, number> = {
  source: 0,
  validate: 260,
  value: 520,
  aggregate: 780,
  publish: 1040,
}

// Vertical row spacing per node within a column.
const ROW_GAP = 96

const nodeTypes: NodeTypes = { pipeline: PipelineNodeCard }

/**
 * Lay nodes out by phase column with even vertical distribution per column.
 * Centers each column around y=0 so the overall DAG has a clean horizontal
 * axis of symmetry.
 */
function computePositions(
  rawNodes: PipelineFixture['nodes']
): Map<string, { x: number; y: number }> {
  const byPhase = new Map<PipelinePhase, typeof rawNodes>()
  for (const n of rawNodes) {
    const arr = byPhase.get(n.data.phase) ?? []
    arr.push(n)
    byPhase.set(n.data.phase, arr)
  }
  const positions = new Map<string, { x: number; y: number }>()
  for (const [phase, ns] of byPhase) {
    const colY0 = -((ns.length - 1) * ROW_GAP) / 2
    ns.forEach((n, i) => {
      positions.set(n.id, { x: PHASE_X[phase], y: colY0 + i * ROW_GAP })
    })
  }
  return positions
}

const defaultEdgeOptions: ReactFlowProps['defaultEdgeOptions'] = {
  type: 'smoothstep',
  animated: false,
  style: { stroke: 'var(--v2-border)', strokeWidth: 1.25 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: 'var(--v2-muted)',
    width: 14,
    height: 14,
  },
}

export function PipelineGraph({
  pipeline,
  selectedId,
  onSelect,
}: PipelineGraphProps) {
  const positions = useMemo(
    () => computePositions(pipeline.nodes),
    [pipeline.nodes]
  )

  const flowNodes: Node<PipelineNodeData>[] = useMemo(
    () =>
      pipeline.nodes.map((n) => ({
        id: n.id,
        type: 'pipeline',
        data: n.data,
        position: positions.get(n.id) ?? { x: 0, y: 0 },
        selected: n.id === selectedId,
      })),
    [pipeline.nodes, positions, selectedId]
  )

  const flowEdges: Edge[] = useMemo(
    () =>
      pipeline.edges.map((e) => {
        const incident =
          selectedId !== null && (e.source === selectedId || e.target === selectedId)
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          className: incident ? 'v2-edge-animated' : undefined,
          style: incident
            ? { stroke: 'var(--v2-foreground)', strokeWidth: 1.25, opacity: 0.85 }
            : undefined,
        }
      }),
    [pipeline.edges, selectedId]
  )

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      onSelect(node.id === selectedId ? null : node.id)
    },
    [onSelect, selectedId]
  )

  const handlePaneClick = useCallback(() => onSelect(null), [onSelect])

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.15, includeHiddenNodes: false }}
        minZoom={0.5}
        maxZoom={1.4}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnScroll={false}
        zoomOnScroll
        panOnDrag
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
      >
      </ReactFlow>
    </div>
  )
}
