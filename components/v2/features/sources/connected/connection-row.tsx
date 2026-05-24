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

const STATUS_PILL: Record<ConnectionStatus, string> = {
  ok: 'bg-[oklch(0.60_0.12_150)]/12 text-[oklch(0.62_0.13_145)]',
  attention: 'bg-[oklch(0.78_0.14_80)]/15 text-[oklch(0.78_0.14_80)]',
  error: 'bg-[oklch(0.62_0.21_25)]/15 text-[oklch(0.62_0.21_25)]',
  paused: 'bg-v2-muted/12 text-v2-muted',
}

const STATUS_DOT: Record<ConnectionStatus, string> = {
  ok: 'bg-[oklch(0.60_0.12_150)]',
  attention: 'bg-[oklch(0.78_0.14_80)]',
  error: 'bg-[oklch(0.62_0.21_25)]',
  paused: 'bg-v2-muted/60',
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
      className="group flex w-full items-center gap-4 rounded-md px-5 py-4 text-left hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground transition-colors duration-150"
    >
      {def?.logo.kind === 'wordmark' ? (
        <span
          aria-hidden="true"
          className={cn('flex size-10 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-semibold', WORDMARK_TONES[def.logo.tone])}
        >
          {def.logo.label}
        </span>
      ) : def?.logo.kind === 'icon' ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-v2-surface-2">
          <def.logo.Icon className="size-4 text-v2-muted" strokeWidth={1.75} />
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 leading-snug">
          <span className="text-[14px] font-medium tracking-tight text-v2-foreground">{connection.name}</span>
          {connection.subtitle ? (
            <span className="rounded-[3px] bg-v2-foreground/[0.04] px-1.5 py-0.5 font-mono text-[10.5px] text-v2-muted">
              {connection.subtitle}
            </span>
          ) : null}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-v2-muted">
          <span>{datasetsLabel}</span>
          <span className="mx-1.5">·</span>
          <span>synced {formatAgo(connection.lastSyncAt)}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
            STATUS_PILL[connection.status],
          )}
        >
          <span aria-hidden="true" className={cn('size-1.5 rounded-full', STATUS_DOT[connection.status])} />
          {STATUS_LABEL[connection.status]}
        </span>
        <ChevronRight aria-hidden="true" className="size-3.5 text-v2-muted/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
      </div>
    </button>
  )
}
