'use client'

import { useMemo, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { KpiStrip } from './kpi-strip'
import { PipelineGraph } from './pipeline-graph'
import { NodeDetailPanel } from './node-detail-panel'
import { CardAura } from './card-aura'
import { overviewPipeline } from './pipeline-fixture'

interface OverviewProps {
  fundName?: string
}

export function Overview({ fundName = 'ACRED · Apollo Diversified Credit' }: OverviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const selectedNode = useMemo(
    () =>
      selectedId
        ? overviewPipeline.nodes.find((n) => n.id === selectedId) ?? null
        : null,
    [selectedId]
  )

  return (
    // Capped width + auto margins mirror the hmm dashboard composition —
    // contained "page" with generous gutters, not a wall-to-wall dashboard.
    <div className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-8 py-2">
      {/* Fund identity header */}
      <header className="flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-[28px] leading-none tracking-tight text-v2-foreground">
            {fundName}
          </h1>
          {/* Live pill — modern indicator that the page is actively running */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-v2-border/50 px-2.5 py-1">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-v2-foreground/40" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-v2-foreground" />
            </span>
            <span className="text-[11px] font-medium leading-none text-v2-muted/70">Live</span>
          </span>
        </div>
        <div className="mt-5">
          <KpiStrip {...overviewPipeline.kpi} />
        </div>
      </header>

      {/* Graph + slide-in detail panel */}
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-v2-border/50 bg-v2-surface">
          <CardAura variant="neutral" id="pipeline-graph" blobX={80} blobY={15} />
          <ReactFlowProvider>
            <PipelineGraph
              pipeline={overviewPipeline}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </ReactFlowProvider>
        </div>
        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  )
}
