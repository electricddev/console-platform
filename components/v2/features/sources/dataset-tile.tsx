'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { ConnectionDataset } from '@/lib/api/schemas'

function fmtCount(n: number, unit: ConnectionDataset['rowUnit']): string {
  let formatted: string
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    formatted = (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + 'M'
  } else if (n >= 1_000) {
    formatted = Math.round(n / 1_000) + 'K'
  } else {
    formatted = String(n)
  }
  return `${formatted} ${unit}`
}

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s`
  if (diff < 3600) return `${Math.round(diff / 60)}m`
  if (diff < 86400) return `${Math.round(diff / 3600)}h`
  return `${Math.round(diff / 86400)}d`
}

type Props = {
  dataset: ConnectionDataset
}

export function DatasetTile({ dataset }: Props) {
  return (
    <Link
      href={`/datasets/${dataset.id}`}
      aria-label={`Dataset ${dataset.name} — ${fmtCount(dataset.rowCount, dataset.rowUnit)}, updated ${fmtRelative(dataset.lastSyncAt)} ago`}
      className={cn(
        'group flex h-full w-full items-center gap-2 rounded-lg border border-v2-border bg-v2-surface px-2.5 py-1.5 transition-colors',
        'hover:border-v2-foreground/25',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-3.5 items-center justify-center rounded-[3px] border border-v2-border bg-v2-surface-2"
      >
        <span className="size-1.5 rounded-[1px] bg-v2-muted/70" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11.5px] font-medium text-v2-foreground">{dataset.name}</div>
        <div className="truncate text-[9.5px] text-v2-muted">
          {fmtCount(dataset.rowCount, dataset.rowUnit)} · {fmtRelative(dataset.lastSyncAt)}
        </div>
      </div>
    </Link>
  )
}
