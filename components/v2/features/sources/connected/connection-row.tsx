'use client'

import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import type { ConnectorConnection, ConnectionDataset, ConnectionStatus } from '@/lib/api/schemas'

const STATUS_LABEL: Record<ConnectionStatus, string> = {
  ok: 'healthy',
  attention: 'attention',
  error: 'error',
  paused: 'paused',
}

const STATUS_DOT_BG: Record<ConnectionStatus, string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

const STATUS_DOT_VARIANT: Record<ConnectionStatus, string> = {
  ok: 'rounded-full',
  attention: 'rounded-full ring-1 ring-current ring-offset-1 ring-offset-v2-surface',
  error: 'rounded-[1px]',
  paused: 'rounded-full bg-transparent border border-v2-muted/60',
}

function formatAgo(iso: string): string {
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`
  return `${Math.round(diffMin / (60 * 24))}d ago`
}

type Props = {
  connection: ConnectorConnection
  datasets: readonly ConnectionDataset[]
  onClick: () => void
}

export function ConnectionRow({ connection, datasets, onClick }: Props) {
  const def = connectorById(connection.connectorId)
  const datasetCount = datasets.length
  const datasetsLabel = datasetCount === 0
    ? 'no datasets'
    : datasetCount <= 2
      ? datasets.map((d) => d.name).join(' + ')
      : `${datasets[0].name} + ${datasetCount - 1}`

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${connection.name} — ${STATUS_LABEL[connection.status]}, ${datasetCount} datasets, last synced ${formatAgo(connection.lastSyncAt)}`}
      className="group flex w-full items-center gap-4 rounded-md px-4 py-3.5 text-left hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
    >
      {def?.logo.kind === 'wordmark' ? (
        <span
          aria-hidden="true"
          className={cn('flex size-9 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold', WORDMARK_TONES[def.logo.tone])}
        >
          {def.logo.label}
        </span>
      ) : def?.logo.kind === 'icon' ? (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-v2-surface-2">
          <def.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.75} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium text-v2-foreground">{connection.name}</div>
        <div className="mt-0.5 truncate text-[11.5px] text-v2-muted">
          {connection.subtitle ? (
            <span className="font-mono text-v2-muted/85">{connection.subtitle}</span>
          ) : null}
          {connection.subtitle ? <span className="mx-1.5">·</span> : null}
          <span>{datasetsLabel}</span>
          <span className="mx-1.5">·</span>
          <span>synced {formatAgo(connection.lastSyncAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 text-[11px] text-v2-muted">
        <span aria-hidden="true" className={cn('size-1.5', STATUS_DOT_BG[connection.status], STATUS_DOT_VARIANT[connection.status])} />
        <span>{STATUS_LABEL[connection.status]}</span>
        <ChevronRight aria-hidden="true" className="size-3.5 text-v2-muted/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </div>
    </button>
  )
}
