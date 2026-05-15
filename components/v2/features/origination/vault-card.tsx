'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { fmtRelative } from './format'
import type { Vault, VaultStatus } from './origination-fixture'

const STATUS_LABEL: Record<VaultStatus, string> = {
  live: 'Live',
  syncing: 'Syncing',
  review: 'In review',
  paused: 'Paused',
}

const STATUS_TONE: Record<VaultStatus, StatusTone> = {
  live: 'success',
  syncing: 'info',
  review: 'warning',
  paused: 'neutral',
}

interface Props {
  vault: Vault
  index: number
}

export function VaultCard({ vault, index }: Props) {
  const palette = getPaletteEntry(vault.palette)
  const hex = palette?.hex ?? '#888'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: 'easeOut' }}
    >
      <AuraCard
        variant="hero"
        accent={hex}
        as={Link}
        href={`/v2/vaults/${vault.id}`}
        interactive
        className="flex h-44 w-full flex-col justify-between p-6 text-left"
      >
        <div className="relative min-w-0">
          <h3 className="text-[24px] font-semibold leading-none tracking-tight text-v2-foreground">
            {vault.symbol}
          </h3>
          <p className="mt-2 truncate text-[13px] text-v2-muted">{vault.sponsor}</p>
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <StatusPill tone={STATUS_TONE[vault.status]} size="xs">
            {STATUS_LABEL[vault.status]}
          </StatusPill>
          <span
            className="text-[12px] tabular-nums text-v2-muted/80"
            suppressHydrationWarning
          >
            {fmtRelative(vault.lastSealAt)}
          </span>
        </div>
      </AuraCard>
    </motion.div>
  )
}
