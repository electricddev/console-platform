'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaletteFamily } from '@/components/v2/lib/palette'
import { DatasetCard } from './dataset-card'
import { datasets } from './data-fixture'
import type { DatasetStatus } from './data-fixture'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'

interface Props {
  vault: Vault
}

const STATUS_FILTERS: Array<{ value: DatasetStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'sealed', label: 'Sealed' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' },
]

type SortKey = 'recent' | 'name' | 'rows'

export function VaultData({ vault }: Props) {
  const family = getPaletteFamily(vault.palette)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<DatasetStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let out = datasets.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (!q) return true
      return (
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q)
      )
    })
    if (sort === 'name') {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === 'rows') {
      out = [...out].sort((a, b) => b.recordCount - a.recordCount)
    } else {
      out = [...out].sort(
        (a, b) => new Date(b.lastSealedAt).getTime() - new Date(a.lastSealedAt).getTime(),
      )
    }
    return out
  }, [query, statusFilter, sort])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 py-4">
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
          The sealed contents of this vault. Search, filter, and open any dataset to manage its
          schema, privacy, and seal history.
        </p>
      </motion.header>

      {/* Controls */}
      <section className="flex flex-col gap-3" aria-label="Dataset controls">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="relative flex w-full max-w-sm items-center">
            <Search
              className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-v2-muted/70"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search datasets, sources, descriptions"
              className="h-9 w-full rounded-lg border border-v2-border/60 bg-v2-surface pl-8 pr-3 text-[12.5px] text-v2-foreground placeholder:text-v2-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
              aria-label="Search datasets"
            />
          </label>
          <div className="flex items-center gap-3 text-[12px] text-v2-muted">
            <span className="font-mono tabular-nums text-v2-muted/70">
              {filtered.length} of {datasets.length}
            </span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-8 rounded-md border border-v2-border/60 bg-v2-surface px-2 text-[11.5px] text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
              aria-label="Sort datasets"
            >
              <option value="recent">Recent</option>
              <option value="name">Name</option>
              <option value="rows">Rows</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              aria-pressed={statusFilter === f.value}
              className={cn(
                'rounded-md px-2.5 py-1 text-[11.5px] font-medium tracking-tight transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground',
                statusFilter === f.value
                  ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                  : 'text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Card stack */}
      <section className="flex flex-col gap-3" aria-label="Datasets">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-v2-border/60 px-6 py-10 text-center">
            <p className="text-[13px] text-v2-muted">No datasets match these filters.</p>
          </div>
        ) : (
          filtered.map((d, i) => (
            <DatasetCard
              key={d.id}
              dataset={d}
              vaultId={vault.id}
              family={family}
              seed={i + 3}
              index={i}
            />
          ))
        )}
      </section>
    </div>
  )
}
