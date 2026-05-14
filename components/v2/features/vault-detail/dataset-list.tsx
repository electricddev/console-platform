'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { fmtRelative } from '@/components/v2/features/origination/format'
import { PrivacyBar, countByPrivacy } from './privacy'
import type { Dataset, DatasetStatus } from './data-fixture'

const STATUS_DOT: Record<DatasetStatus, string> = {
  sealed: 'bg-v2-success',
  pending: 'bg-v2-warning',
  failed: 'bg-v2-danger',
}

const STATUS_LABEL: Record<DatasetStatus, string> = {
  sealed: 'Sealed',
  pending: 'Pending seal',
  failed: 'Failed',
}

interface Props {
  datasets: Dataset[]
  selectedId: string | null
  onSelect: (id: string) => void
}

function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return new Intl.NumberFormat('en-US').format(n)
}

export function DatasetList({ datasets, selectedId, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      {datasets.map((d, i) => {
        const isSelected = d.id === selectedId
        const mix = countByPrivacy(d.fields, d.fieldCount)
        return (
          <motion.button
            key={d.id}
            type="button"
            onClick={() => onSelect(d.id)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03, duration: 0.3 }}
            className={cn(
              'group relative w-full rounded-xl border text-left transition-all duration-200',
              isSelected
                ? 'border-v2-border bg-v2-surface shadow-sm shadow-black/[0.03] dark:shadow-black/30'
                : 'border-v2-border/40 bg-v2-surface/60 hover:border-v2-border hover:bg-v2-surface hover:shadow-sm',
              'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground'
            )}
          >
            <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
              {/* Status dot column */}
              <span className="relative mt-[6px] inline-flex h-1.5 w-1.5 shrink-0">
                {d.status === 'pending' && (
                  <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-v2-warning/60 motion-reduce:hidden" />
                )}
                <span
                  className={cn(
                    'relative inline-flex h-1.5 w-1.5 rounded-full',
                    STATUS_DOT[d.status]
                  )}
                />
              </span>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[14px] font-medium tracking-tight text-v2-foreground">
                    {d.name}
                  </p>
                  <span
                    className="shrink-0 font-mono text-[10.5px] tabular-nums text-v2-muted/70"
                    suppressHydrationWarning
                  >
                    {fmtRelative(d.lastSealedAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12px] text-v2-muted">{d.source}</p>

                {/* Meta row: rows · fields · ASC class · status */}
                <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-v2-muted/80">
                  <span className="font-mono tabular-nums">
                    <span className="text-v2-foreground/80">{fmtCount(d.recordCount)}</span> rows
                  </span>
                  <span className="text-v2-border">·</span>
                  <span className="font-mono tabular-nums">
                    <span className="text-v2-foreground/80">{fmtCount(d.fieldCount)}</span> fields
                  </span>
                  {d.ascClass && (
                    <>
                      <span className="text-v2-border">·</span>
                      <AscChip cls={d.ascClass} />
                    </>
                  )}
                  <span className="text-v2-border">·</span>
                  <span className={cn(
                    'inline-flex items-center gap-1',
                    d.status === 'sealed' && 'text-v2-success/90',
                    d.status === 'pending' && 'text-v2-warning',
                    d.status === 'failed' && 'text-v2-danger'
                  )}>
                    {STATUS_LABEL[d.status]}
                  </span>
                </div>

                {/* Privacy mix bar */}
                <div className="mt-2.5">
                  <PrivacyBar
                    onChain={mix.onChain}
                    queryable={mix.queryable}
                    privateCount={mix.private}
                    height="h-[3px]"
                  />
                </div>
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}

function AscChip({ cls }: { cls: 'L1' | 'L2' | 'L3' }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-v2-foreground/[0.05] px-1.5 py-[1px] font-mono text-[9.5px] font-medium tracking-tight text-v2-foreground/80">
      <span className="text-v2-muted">ASC 820</span>
      {cls}
    </span>
  )
}
