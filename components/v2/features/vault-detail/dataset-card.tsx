'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { fmtRelative } from '@/components/v2/features/origination/format'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { PrivacyBar, countByPrivacy } from './privacy'
import type { Dataset, DatasetStatus } from './data-fixture'

const STATUS_TONE: Record<DatasetStatus, StatusTone> = {
  sealed: 'success',
  pending: 'warning',
  failed: 'danger',
}

const STATUS_LABEL: Record<DatasetStatus, string> = {
  sealed: 'Sealed',
  pending: 'Pending seal',
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
  const mix = countByPrivacy(dataset.fields, dataset.fieldCount)
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
        className="group flex flex-col gap-4 p-5"
      >
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-[16px] font-medium tracking-tight text-v2-foreground">
                {dataset.name}
              </h3>
              <StatusPill tone={STATUS_TONE[dataset.status]} size="xs">
                {STATUS_LABEL[dataset.status]}
              </StatusPill>
              {dataset.ascClass && (
                <span className="rounded-md bg-v2-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-v2-muted">
                  ASC 820 · {dataset.ascClass}
                </span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-v2-muted">{dataset.source}</p>
            <p className="mt-2 max-w-prose text-[13px] leading-relaxed text-v2-muted/90">
              {dataset.description}
            </p>
          </div>
          <ArrowUpRight
            className="h-4 w-4 shrink-0 text-v2-muted/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-v2-foreground"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </div>

        <div className="relative flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] tabular-nums text-v2-muted/80">
            <span>
              <span className="text-v2-foreground/90">{fmtCount(dataset.recordCount)}</span>{' '}
              <span className="text-v2-muted/60">rows</span>
            </span>
            <span>
              <span className="text-v2-foreground/90">{fmtCount(dataset.fieldCount)}</span>{' '}
              <span className="text-v2-muted/60">fields</span>
            </span>
            <span>
              <span className="text-v2-foreground/90">{dataset.sealHistory.length}</span>{' '}
              <span className="text-v2-muted/60">seals</span>
            </span>
            <span className="text-v2-muted/60" suppressHydrationWarning>
              · sealed {fmtRelative(dataset.lastSealedAt)}
            </span>
          </div>
          <PrivacyBar
            onChain={mix.onChain}
            queryable={mix.queryable}
            privateCount={mix.private}
            height="h-1.5"
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10.5px] tabular-nums text-v2-muted/70">
            <span>{fmtCount(mix.onChain)} on-chain</span>
            <span>{fmtCount(mix.queryable)} queryable</span>
            <span>{fmtCount(mix.private)} private</span>
          </div>
        </div>
      </AuraCard>
    </motion.div>
  )
}
