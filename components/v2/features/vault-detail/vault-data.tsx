'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { DatasetDetail } from './dataset-detail'
import { DatasetList } from './dataset-list'
import { VaultDataPolicy } from './vault-data-policy'
import { datasets, findDataset } from './data-fixture'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'

interface Props {
  vault: Vault
}

type FilterKey = 'all' | 'sealed' | 'pending' | 'failed'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'sealed', label: 'Sealed' },
  { key: 'pending', label: 'Pending' },
  { key: 'failed', label: 'Failed' },
]

export function VaultData({ vault }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterKey>('all')

  const selected = selectedId ? findDataset(selectedId) : null

  const visibleDatasets = useMemo(() => {
    if (filter === 'all') return datasets
    return datasets.filter((d) => d.status === filter)
  }, [filter])

  const counts = useMemo(() => {
    const c = { all: datasets.length, sealed: 0, pending: 0, failed: 0 }
    for (const d of datasets) c[d.status]++
    return c
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 py-4">
      {/* Hero header */}
      <motion.header
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-1.5"
      >
        <p className="text-[12px] tracking-tight text-v2-muted/80">
          {vault.symbol} · {vault.sponsor}
        </p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-v2-foreground">
          Data
        </h1>
        <p className="max-w-prose text-[14px] leading-relaxed text-v2-muted">
          The sealed contents of this data vault. Per-field privacy controls determine
          what leaves the vault — counterparties compute against approved aggregates and
          on-chain references, never raw rows.
        </p>
      </motion.header>

      {/* Master/detail body */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT — Sealed datasets */}
        <section className="flex flex-col gap-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[15px] font-medium tracking-tight text-v2-foreground">
                Sealed datasets
              </h2>
              <span className="font-mono text-[11px] tabular-nums text-v2-muted/70">
                {visibleDatasets.length} of {datasets.length}
              </span>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {FILTERS.map((f) => {
              const isActive = filter === f.key
              const count = counts[f.key]
              if (f.key !== 'all' && count === 0) return null
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    'group inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium tracking-tight transition-all duration-150',
                    isActive
                      ? 'border-v2-border bg-v2-surface text-v2-foreground shadow-sm shadow-black/[0.02] dark:shadow-black/30'
                      : 'border-transparent bg-transparent text-v2-muted hover:bg-v2-foreground/[0.045] hover:text-v2-foreground',
                    'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
                  )}
                  aria-pressed={isActive}
                >
                  {f.label}
                  <span className="font-mono text-[10.5px] tabular-nums text-v2-muted/70">
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          <DatasetList
            datasets={visibleDatasets}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
          />
        </section>

        {/* RIGHT — Default = vault policy, or selected dataset detail */}
        <aside className="relative lg:col-span-7">
          <div className="lg:sticky lg:top-2">
            <AnimatePresence mode="wait" initial={false}>
              {selected ? (
                <DatasetDetail
                  key={`detail-${selected.id}`}
                  dataset={selected}
                  onBack={() => setSelectedId(null)}
                />
              ) : (
                <VaultDataPolicy key="policy" />
              )}
            </AnimatePresence>
          </div>
        </aside>
      </div>
    </div>
  )
}
