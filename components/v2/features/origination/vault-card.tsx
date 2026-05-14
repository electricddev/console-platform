'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { fmtRelative } from './format'
import type { Vault, VaultStatus } from './origination-fixture'

const STATUS_LABEL: Record<VaultStatus, string> = {
  live: 'Live',
  syncing: 'Syncing',
  review: 'In review',
  paused: 'Paused',
}

const STATUS_DOT: Record<VaultStatus, string> = {
  live: 'bg-v2-success',
  syncing: 'bg-v2-info',
  review: 'bg-v2-warning',
  paused: 'bg-v2-muted/60',
}

interface Props {
  vault: Vault
  index: number
}

export function VaultCard({ vault, index }: Props) {
  const palette = getPaletteEntry(vault.palette)
  const hex = palette?.hex ?? '#888'
  const hexEnd = palette?.hexEnd ?? hex

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: 'easeOut' }}
    >
      <AuraCard
        variant="hero"
        accent={hex}
        accentEnd={hexEnd}
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
          <div className="flex items-center gap-1.5 text-[12px] text-v2-muted">
            <span className="relative inline-flex h-1.5 w-1.5">
              {vault.status === 'syncing' && (
                <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-v2-info/60 motion-reduce:hidden" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-1.5 w-1.5 rounded-full',
                  STATUS_DOT[vault.status]
                )}
              />
            </span>
            {STATUS_LABEL[vault.status]}
          </div>
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
