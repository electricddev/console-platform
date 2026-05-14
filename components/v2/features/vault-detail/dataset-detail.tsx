'use client'

import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Surface } from '@/components/v2/ui/surface'
import { fmtRelative } from '@/components/v2/features/origination/format'
import { PRIVACY_TONE, PrivacyBar, PrivacyChip, countByPrivacy } from './privacy'
import type { AscClass, Dataset, DatasetStatus, FieldType } from './data-fixture'

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

const TYPE_LABEL: Record<FieldType, string> = {
  string: 'string',
  number: 'num',
  currency: 'currency',
  percent: 'pct',
  date: 'date',
  enum: 'enum',
  address: 'addr',
  bool: 'bool',
  hash: 'hash',
}

const ASC_DESCRIPTION: Record<AscClass, string> = {
  L1: 'Quoted prices in active markets',
  L2: 'Observable inputs, not Level 1',
  L3: 'Unobservable inputs, internal models',
}

function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`
  return new Intl.NumberFormat('en-US').format(n)
}

interface Props {
  dataset: Dataset
  onBack: () => void
}

export function DatasetDetail({ dataset, onBack }: Props) {
  const mix = countByPrivacy(dataset.fields, dataset.fieldCount)

  return (
    <motion.div
      key={`ds-${dataset.id}`}
      initial={{ opacity: 0, x: 6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -6 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-6"
    >
      {/* Back affordance */}
      <button
        type="button"
        onClick={onBack}
        className={cn(
          'group inline-flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-[11.5px] font-medium tracking-tight text-v2-muted transition-colors',
          'hover:bg-v2-foreground/[0.045] hover:text-v2-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
        )}
      >
        <ArrowLeft
          className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
        Vault data policy
      </button>

      {/* Header */}
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-v2-muted/70">
          Dataset
        </p>
        <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-v2-foreground">
          {dataset.name}
        </h2>
        <p className="text-[13px] text-v2-muted">{dataset.source}</p>
        <p className="mt-1 max-w-prose text-[13px] leading-relaxed text-v2-muted/90">
          {dataset.description}
        </p>
      </header>

      {/* Status + ASC */}
      <div className="flex flex-wrap items-center gap-3 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="relative inline-flex h-1.5 w-1.5">
            {dataset.status === 'pending' && (
              <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-v2-warning/60 motion-reduce:hidden" />
            )}
            <span
              className={cn(
                'relative inline-flex h-1.5 w-1.5 rounded-full',
                STATUS_DOT[dataset.status]
              )}
            />
          </span>
          <span
            className={cn(
              'font-medium',
              dataset.status === 'sealed' && 'text-v2-success',
              dataset.status === 'pending' && 'text-v2-warning',
              dataset.status === 'failed' && 'text-v2-danger'
            )}
          >
            {STATUS_LABEL[dataset.status]}
          </span>
          <span className="text-v2-muted/70" suppressHydrationWarning>
            · {fmtRelative(dataset.lastSealedAt)}
          </span>
        </div>
        {dataset.ascClass && (
          <>
            <span className="text-v2-border">·</span>
            <div className="flex items-center gap-1.5">
              <span className="rounded-md bg-v2-foreground/[0.06] px-1.5 py-0.5 font-mono text-[10.5px] font-medium text-v2-foreground/80">
                ASC 820 · {dataset.ascClass}
              </span>
              <span className="text-v2-muted/70">{ASC_DESCRIPTION[dataset.ascClass]}</span>
            </div>
          </>
        )}
      </div>

      {/* Quick stats + mix */}
      <Surface radius="xl" className="flex flex-col gap-3 p-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Rows" value={fmtCount(dataset.recordCount)} />
          <Stat label="Fields" value={fmtCount(dataset.fieldCount)} />
          <Stat label="Seals" value={String(dataset.sealHistory.length)} />
        </div>
        <div className="flex flex-col gap-1.5 pt-1">
          <p className="text-[10.5px] uppercase tracking-[0.12em] text-v2-muted/70">
            Privacy mix
          </p>
          <PrivacyBar
            onChain={mix.onChain}
            queryable={mix.queryable}
            privateCount={mix.private}
            height="h-1.5"
          />
          <div className="flex items-center gap-3 text-[11px]">
            <MixCount level="on-chain" count={mix.onChain} />
            <MixCount level="queryable" count={mix.queryable} />
            <MixCount level="private" count={mix.private} />
          </div>
        </div>
      </Surface>

      {/* Schema */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[13px] font-medium tracking-tight text-v2-foreground">
            Schema
          </h3>
          <p className="font-mono text-[10.5px] tabular-nums text-v2-muted/70">
            Showing {dataset.fields.length} of {fmtCount(dataset.fieldCount)}
          </p>
        </div>
        <Surface radius="xl" className="divide-y divide-v2-border/40">
          {dataset.fields.map((f) => (
            <div
              key={f.name}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate font-mono text-[12.5px] tracking-tight text-v2-foreground">
                  {f.name}
                </p>
                {f.description && (
                  <p className="truncate text-[11px] text-v2-muted/80">{f.description}</p>
                )}
              </div>
              <span className="rounded-md bg-v2-foreground/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-v2-muted">
                {TYPE_LABEL[f.type]}
              </span>
              <PrivacyChip level={f.privacy} size="xs" />
            </div>
          ))}
        </Surface>
      </section>

      {/* Seal history */}
      <section className="flex flex-col gap-3">
        <h3 className="text-[13px] font-medium tracking-tight text-v2-foreground">
          Seal history
        </h3>
        <Surface radius="xl" className="divide-y divide-v2-border/40">
          {dataset.sealHistory.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <span className="relative mt-0.5 inline-flex h-1.5 w-1.5 shrink-0">
                <span
                  className={cn(
                    'relative inline-flex h-1.5 w-1.5 rounded-full',
                    i === 0 ? 'bg-v2-success' : 'bg-v2-muted/60'
                  )}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] text-v2-foreground">
                  <span
                    className="font-mono tabular-nums text-v2-foreground/90"
                    suppressHydrationWarning
                  >
                    {fmtRelative(s.at)}
                  </span>
                  <span className="mx-1.5 text-v2-muted/40">·</span>
                  <span className="font-mono tabular-nums text-v2-muted">
                    {fmtCount(s.records)} rows
                  </span>
                </p>
                <p className="mt-0.5 truncate text-[11px] text-v2-muted">
                  by <span className="text-v2-foreground/80">{s.by}</span>
                </p>
              </div>
              <span className="shrink-0 rounded-md border border-v2-border/60 bg-v2-surface px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground/80">
                {s.hash}
              </span>
            </div>
          ))}
        </Surface>
      </section>
    </motion.div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-[0.12em] text-v2-muted/70">{label}</p>
      <p className="mt-1 font-mono text-[16px] font-semibold leading-none tracking-tight tabular-nums text-v2-foreground">
        {value}
      </p>
    </div>
  )
}

function MixCount({
  level,
  count,
}: {
  level: 'on-chain' | 'queryable' | 'private'
  count: number
}) {
  const tone = PRIVACY_TONE[level]
  return (
    <span className="flex items-center gap-1">
      <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
      <span className="font-mono tabular-nums text-v2-foreground/80">{count}</span>
      <span className="text-v2-muted">{tone.short.toLowerCase()}</span>
    </span>
  )
}
