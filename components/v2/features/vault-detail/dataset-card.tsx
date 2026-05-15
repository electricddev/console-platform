'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { fmtRelative } from '@/components/v2/features/origination/format'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { AuraCard } from '@/components/v2/ui/aura-card'
import type { Dataset, DatasetStatus } from './data-fixture'

const STATUS_TONE: Record<DatasetStatus, StatusTone> = {
  live: 'success',
  syncing: 'warning',
  failed: 'danger',
}

const STATUS_LABEL: Record<DatasetStatus, string> = {
  live: 'Live',
  syncing: 'Syncing',
  failed: 'Failed',
}

function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`
  return new Intl.NumberFormat('en-US').format(n)
}

interface Props {
  dataset: Dataset
  vaultId: string
  family: [string, string, string]
  seed: number
  index?: number
}

export function DatasetCard({ dataset, vaultId, family, seed, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.25), duration: 0.28, ease: 'easeOut' }}
    >
      <AuraCard
        variant="muted"
        family={family}
        seed={seed}
        as={Link}
        href={`/v2/vaults/${vaultId}/data/${dataset.id}`}
        interactive
        radius="xl"
        className="group flex flex-col gap-3 p-5"
      >
        {/* Name + status row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[16px] font-medium tracking-tight text-v2-foreground">
                {dataset.name}
              </h3>
              <StatusPill tone={STATUS_TONE[dataset.status]} size="xs">
                {STATUS_LABEL[dataset.status]}
              </StatusPill>
            </div>
            <p className="mt-1 text-[12.5px] text-v2-muted">{dataset.source}</p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-v2-muted/40 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-v2-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>

        {/* Metric line */}
        <p className="font-mono text-[11.5px] tabular-nums text-v2-muted/80" suppressHydrationWarning>
          <span className="text-v2-foreground/90">{fmtCount(dataset.recordCount)}</span>{' '}
          <span className="text-v2-muted/60">rows</span>
          <span className="text-v2-muted/40"> · </span>
          <span className="text-v2-muted/60">synced {fmtRelative(dataset.lastSyncedAt)}</span>
        </p>
      </AuraCard>
    </motion.div>
  )
}
