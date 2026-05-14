'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import { Surface } from '@/components/v2/ui/surface'
import { VaultCard } from './vault-card'
import { fmtRelative } from './format'
import { activityFeed, vaults } from './origination-fixture'

export function Vaults() {
  const recent = useMemo(() => activityFeed.slice(0, 6), [])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 py-4">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-1.5"
      >
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-v2-foreground">
          Data Vaults
        </h1>
        <p className="text-[14px] text-v2-muted">
          Tokenized funds under your administration. Each data vault holds the
          private data and the proofs counterparties consume.
        </p>
      </motion.header>

      {/* Vaults grid */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-v2-foreground">Data Vaults</h2>
          <Surface
            as="button"
            type="button"
            interactive
            radius="md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-v2-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            New data vault
          </Surface>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vaults.map((v, i) => (
            <VaultCard key={v.id} vault={v} index={i} />
          ))}
        </div>
      </section>

      {/* Recent activity */}
      <section className="flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <h2 className="text-[16px] font-medium text-v2-foreground">Recent activity</h2>
          <Surface
            as={Link}
            href="/v2/audit"
            interactive
            radius="md"
            className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium text-v2-foreground"
          >
            View all
          </Surface>
        </div>
        <ul className="flex flex-col gap-1">
          {recent.map((e, i) => {
            const vault = vaults.find((v) => v.id === e.vaultId)
            const palette = vault ? getPaletteEntry(vault.palette) : undefined
            return (
              <motion.li
                key={e.id}
                initial={{ opacity: 0, x: -2 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03, duration: 0.3 }}
              >
                <Link
                  href={`/v2/vaults/${e.vaultId}`}
                  className="group flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-3 py-3 transition-all duration-150 hover:border-v2-border/60 hover:bg-v2-surface/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: palette?.hex ?? 'var(--v2-muted)' }}
                  />
                  <span className="w-20 shrink-0 text-[14px] font-medium text-v2-foreground">
                    {e.vaultSymbol}
                  </span>
                  <span className="flex-1 truncate text-[14px] text-v2-muted">
                    <span className="text-v2-foreground/80">{e.actor}</span>{' '}
                    {e.action}
                  </span>
                  <span
                    className="shrink-0 text-[12.5px] tabular-nums text-v2-muted/70 transition-colors group-hover:text-v2-muted"
                    suppressHydrationWarning
                  >
                    {fmtRelative(e.at)}
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
