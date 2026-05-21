'use client'

import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from './catalog-data'
import type { ConnectorConnection } from '@/lib/api/schemas'

const STATUS_CLASS: Record<ConnectorConnection['status'], string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

const STATUS_LABEL: Record<ConnectorConnection['status'], string> = {
  ok: 'healthy',
  attention: 'attention',
  error: 'error',
  paused: 'paused',
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

type Props = {
  connection: ConnectorConnection
  datasetCount: number
  selected?: boolean
  onSelect?: () => void
}

export function SourceTile({ connection, datasetCount, selected, onSelect }: Props) {
  const def = connectorById(connection.connectorId)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${connection.name} — ${STATUS_LABEL[connection.status]}, ${datasetCount} datasets, synced ${fmtRelative(connection.lastSyncAt)}`}
      className={cn(
        'group flex h-full w-full items-center gap-3 rounded-[10px] border bg-v2-surface px-3 py-2.5 text-left transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        selected
          ? 'border-v2-foreground/40 shadow-sm'
          : 'border-v2-border hover:border-v2-foreground/30',
      )}
    >
      <Logo def={def} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">
          {connection.name}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-v2-muted">
          <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', STATUS_CLASS[connection.status])} />
          <span className="truncate">
            {datasetCount} dataset{datasetCount === 1 ? '' : 's'} · synced {fmtRelative(connection.lastSyncAt)}
          </span>
        </div>
      </div>
    </button>
  )
}

function Logo({ def }: { def: ReturnType<typeof connectorById> }) {
  if (!def) {
    return <div className="size-7 rounded-md bg-v2-surface-2" aria-hidden="true" />
  }
  if (def.logo.kind === 'wordmark') {
    const length = def.logo.label.length
    const textSize =
      length <= 1 ? 'text-sm' : length <= 2 ? 'text-xs' : length <= 3 ? 'text-[11px]' : 'text-[10px]'
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex size-7 items-center justify-center rounded-md font-mono font-semibold tracking-tight',
          WORDMARK_TONES[def.logo.tone],
          textSize,
        )}
      >
        {def.logo.label}
      </span>
    )
  }
  const Icon = def.logo.Icon
  return (
    <span className="flex size-7 items-center justify-center rounded-md border border-v2-border bg-v2-surface">
      <Icon className="size-4 text-v2-muted" strokeWidth={1.6} aria-hidden="true" />
    </span>
  )
}
