'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import type { PipelineNodeData, PipelineStatus } from './pipeline-types'

const STATUS_DOT: Record<PipelineStatus, string> = {
  attested: 'bg-v2-success',
  pending: 'bg-v2-warning',
  failed: 'bg-v2-danger',
}

const STATUS_RING: Record<PipelineStatus, string> = {
  attested: 'ring-v2-success/30',
  pending: 'ring-v2-warning/30',
  failed: 'ring-v2-danger/40',
}

const STATUS_LABEL: Record<PipelineStatus, string> = {
  attested: 'Attested',
  pending: 'Pending',
  failed: 'Failed',
}

/** Relative-time formatter — "12m ago", "3h ago", "just now". */
function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  if (diffMs < 0) return 'in queue'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

export const PipelineNodeCard = memo(function PipelineNodeCard({
  data,
  selected,
}: NodeProps<PipelineNodeData>) {
  const { label, status, cadence, lastRunAt, phase } = data
  // Hide left handle on source-column nodes, right handle on publish column.
  const showLeftHandle = phase !== 'source'
  const showRightHandle = phase !== 'publish'

  return (
    <div
      className={cn(
        'group relative w-[180px] rounded-md border bg-v2-surface px-3 py-2.5 text-left transition-all duration-150',
        'shadow-[0_1px_0_rgba(255,255,255,0.02)_inset] hover:-translate-y-px hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.35)]',
        selected
          ? 'border-v2-foreground/60 ring-1 ring-v2-foreground/20'
          : 'border-v2-border hover:border-v2-foreground/30'
      )}
    >
      {/* Status dot + label row */}
      <div className="flex items-start gap-2">
        <span
          className={cn(
            'mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ring-2',
            STATUS_DOT[status],
            STATUS_RING[status]
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-[10px] uppercase leading-none tracking-[0.1em] text-v2-muted/70">
            {STATUS_LABEL[status]}
          </p>
        </div>
      </div>

      {/* Footer: cadence + last run */}
      <div className="mt-2.5 flex items-center justify-between text-[10px] leading-none">
        <span className="truncate font-mono text-v2-muted">{cadence}</span>
        <span
          className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
          title={new Date(lastRunAt).toISOString()}
          suppressHydrationWarning
        >
          {relativeTime(lastRunAt)}
        </span>
      </div>

      {/* React Flow handles — visually muted, only present where edges connect. */}
      {showLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-1.5 !w-1.5 !border-0 !bg-v2-border"
          isConnectable={false}
        />
      )}
      {showRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-1.5 !w-1.5 !border-0 !bg-v2-border"
          isConnectable={false}
        />
      )}
    </div>
  )
})
