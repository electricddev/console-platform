'use client'

import Link from 'next/link'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import { cn } from '@/lib/utils'
import type { VaultRef } from '@/lib/api/schemas'

type Props = {
  vault: VaultRef
}

export function VaultPeripheralTile({ vault }: Props) {
  const palette = getPaletteEntry(vault.palette)
  const hex = palette?.hex ?? 'var(--v2-muted)'
  return (
    <Link
      href={`/vaults/${vault.id}`}
      aria-label={`Vault ${vault.symbol} — ${vault.sponsor}, ${vault.datasetCount} datasets, ${vault.consumerCount} consumers`}
      className={cn(
        'group flex h-full w-full flex-col justify-between rounded-xl border border-v2-border bg-v2-surface px-3.5 py-2.5 transition-colors',
        'hover:border-v2-foreground/30',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-2.5 rounded-full" style={{ background: hex }} />
          <span className="text-[13px] font-semibold tracking-tight text-v2-foreground">{vault.symbol}</span>
        </div>
        <p className="mt-1 line-clamp-1 text-[10.5px] text-v2-muted">{vault.sponsor}</p>
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-v2-muted">
        <span>
          <span className="font-mono tabular-nums text-v2-foreground">{vault.datasetCount}</span> datasets
        </span>
        <span>
          <span className="font-mono tabular-nums text-v2-foreground">{vault.consumerCount}</span> consumers
        </span>
      </div>
    </Link>
  )
}
