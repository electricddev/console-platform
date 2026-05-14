'use client'

import { useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { computeAttention } from './attention'
import { PipelineGraph } from './pipeline-graph'
import { Rail } from './rail'
import { overviewPipeline } from './pipeline-fixture'

interface OverviewProps {
  fundName?: string
}

function fmtAsOf(t: number): string {
  const d = new Date(t)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`
}

export function Overview({ fundName = 'ACRED' }: OverviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dimNodeIds, setDimNodeIds] = useState<string[] | null>(null)

  // Live as-of clock — updates each second, SSR-safe.
  const [asOf, setAsOf] = useState(() => fmtAsOf(Date.now()))
  useEffect(() => {
    const id = window.setInterval(() => setAsOf(fmtAsOf(Date.now())), 1000)
    return () => window.clearInterval(id)
  }, [])

  // Esc key returns the rail to idle state (State A).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selectedNode = useMemo(
    () =>
      selectedId
        ? overviewPipeline.nodes.find((n) => n.id === selectedId) ?? null
        : null,
    [selectedId]
  )

  const attention = useMemo(() => computeAttention(overviewPipeline), [])

  const { attestedCount, pendingCount, failedCount } = useMemo(() => {
    let a = 0,
      p = 0,
      f = 0
    for (const n of overviewPipeline.nodes) {
      if (n.data.status === 'attested') a++
      else if (n.data.status === 'pending') p++
      else if (n.data.status === 'failed') f++
    }
    return { attestedCount: a, pendingCount: p, failedCount: f }
  }, [])

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-6 py-2">
      {/* Page header */}
      <header className="flex shrink-0 flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] leading-none">
          <span className="font-mono uppercase tracking-[0.16em] text-v2-muted/70">
            {'// overview'}
          </span>
          <span
            className="font-mono tabular-nums text-v2-muted/70"
            suppressHydrationWarning
          >
            as of {asOf}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="flex items-baseline gap-2 font-serif text-[28px] leading-none tracking-tight text-v2-foreground">
            <span>{fundName}</span>
            <span className="font-sans text-[13px] tracking-normal text-v2-muted">
              · Apollo Diversified Credit
            </span>
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-v2-border/50 px-2.5 py-1">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-v2-foreground/40 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-v2-foreground" />
            </span>
            <span className="text-[11px] font-medium leading-none text-v2-muted/70">
              {failedCount > 0
                ? `Live · ${failedCount} failed`
                : pendingCount > 0
                  ? `Live · ${pendingCount} pending`
                  : 'Live'}
            </span>
          </span>
        </div>
      </header>

      {/* DAG canvas (naked) + glass rail */}
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="relative min-w-0 flex-1">
          <ReactFlowProvider>
            <PipelineGraph
              pipeline={overviewPipeline}
              selectedId={selectedId}
              onSelect={setSelectedId}
              dimNodeIds={dimNodeIds}
            />
          </ReactFlowProvider>
        </div>
        <Rail
          selectedNode={selectedNode}
          attention={attention}
          nextPublishAt={overviewPipeline.kpi.nextPublishAt}
          attestedCount={attestedCount}
          pendingCount={pendingCount}
          failedCount={failedCount}
          onClearSelection={() => setSelectedId(null)}
          onAttentionRowSelect={(id) => setSelectedId(id)}
          onHoverDimSet={setDimNodeIds}
        />
      </div>
    </div>
  )
}
