'use client'

import { memo, useEffect, useState, type ReactElement } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import { OUTPUT_NODE_ID, OUTPUT_PER_SHARE_NODE_ID } from './node-ids'
import type { PipelineNodeData, PipelineStatus } from './pipeline-types'

const STATUS_DOT: Record<PipelineStatus, string> = {
  attested: 'bg-v2-success',
  pending: 'bg-v2-warning',
  failed: 'bg-v2-danger',
}

const STATUS_GLOW: Record<PipelineStatus, string> = {
  attested: 'shadow-[0_0_8px_rgba(64,160,90,0.45)]',
  pending: 'shadow-[0_0_8px_rgba(210,160,60,0.55)]',
  failed: 'shadow-[0_0_10px_rgba(220,80,60,0.55)]',
}

/** Re-render every second so timestamps and countdowns tick live. */
function useTick(intervalMs = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

function relativeTime(iso: string, now: number): string {
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

function countdown(targetIso: string, now: number): string {
  const ms = Math.max(0, new Date(targetIso).getTime() - now)
  const total = Math.floor(ms / 1000)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

interface FooterProps {
  data: PipelineNodeData
}

function StandardFooter({ data }: FooterProps) {
  const now = useTick()
  return (
    <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
      <span className="truncate font-mono text-v2-muted">{data.cadence}</span>
      <span
        className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
        title={new Date(data.lastRunAt).toISOString()}
        suppressHydrationWarning
      >
        {relativeTime(data.lastRunAt, now)}
      </span>
    </div>
  )
}

function PerShareFooter({ data }: FooterProps) {
  const now = useTick()
  return (
    <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
      <span className="truncate font-mono tabular-nums text-v2-foreground">
        {data.output.value}
      </span>
      <span
        className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
        suppressHydrationWarning
      >
        {relativeTime(data.lastRunAt, now)}
      </span>
    </div>
  )
}

function AttestFooter({ data }: FooterProps) {
  const now = useTick()
  const totalNavInput = data.inputs.find((i) => i.label === 'nav')
  const displayValue = totalNavInput?.value ?? data.output.value
  return (
    <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
      <span className="truncate font-mono tabular-nums text-v2-foreground">
        {displayValue}
      </span>
      <span
        className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
        title={new Date(data.nextRunAt).toISOString()}
        suppressHydrationWarning
      >
        next {countdown(data.nextRunAt, now)}
      </span>
    </div>
  )
}

export const PipelineNodeCard = memo(function PipelineNodeCard({
  id,
  data,
  selected,
}: NodeProps<PipelineNodeData>) {
  const { status, phase, label } = data
  const showLeftHandle = phase !== 'source'
  const showRightHandle = phase !== 'publish'

  let Footer: (p: FooterProps) => ReactElement = StandardFooter
  if (id === OUTPUT_PER_SHARE_NODE_ID) Footer = PerShareFooter
  else if (id === OUTPUT_NODE_ID) Footer = AttestFooter

  return (
    <div
      className={cn(
        'group relative w-[155px] rounded-md border bg-transparent px-3 py-2 text-left',
        'transition-all duration-150',
        'hover:-translate-y-px',
        selected
          ? 'border-v2-foreground/70 ring-1 ring-v2-foreground/15 shadow-[0_0_24px_-8px_rgba(220,170,140,0.45)]'
          : status === 'failed'
            ? 'border-v2-danger/50 shadow-[0_0_24px_-10px_rgba(220,80,60,0.5)]'
            : 'border-v2-border/60 hover:border-v2-foreground/40'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
            STATUS_DOT[status],
            STATUS_GLOW[status]
          )}
          aria-hidden="true"
        />
        <p className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">
          {label}
        </p>
      </div>

      <Footer data={data} />

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
