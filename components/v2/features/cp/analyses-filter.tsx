'use client'

import { useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill } from '@/components/v2/ui/status-pill'
import { ChainBadge } from './chain-badge'
import { VersionTag, analysisTone } from './version-tag'
import {
  type Analysis,
  type ChainId,
} from './cp-fixtures'
import {
  fmtRelative,
  fmtTrigger,
  ANALYSIS_STATUS_LABEL,
  ANALYSIS_STATUS_TONE,
} from './cp-format'

type StatusFilter =
  | 'all'
  | 'approved_executing'
  | 'proposed'
  | 'changes_requested'
  | 'denied'
  | 'draft'
  | 'retired'

type VaultFilter = 'all' | 'acred' | 'maple-tf-revolver' | 'buidl-treasury'

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Executing', value: 'approved_executing' },
  { label: 'Proposed', value: 'proposed' },
  { label: 'Changes req.', value: 'changes_requested' },
  { label: 'Denied', value: 'denied' },
  { label: 'Draft', value: 'draft' },
  { label: 'Retired', value: 'retired' },
]

const VAULT_CHIPS: { label: string; value: VaultFilter }[] = [
  { label: 'All vaults', value: 'all' },
  { label: 'ACRED', value: 'acred' },
  { label: 'Maple TF', value: 'maple-tf-revolver' },
  { label: 'BUIDL', value: 'buidl-treasury' },
]

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center rounded-md border px-2.5 font-mono text-[11px] tracking-tight transition-all duration-150',
        active
          ? 'border-v2-foreground/30 bg-v2-foreground/[0.08] text-v2-foreground'
          : 'border-v2-border/50 bg-transparent text-v2-muted hover:border-v2-border hover:text-v2-foreground',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground',
      )}
    >
      {label}
    </button>
  )
}

export function AnalysesFilter({ analyses }: { analyses: Analysis[] }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [vaultFilter, setVaultFilter] = useState<VaultFilter>('all')

  const filtered = analyses.filter((a) => {
    const statusOk = statusFilter === 'all' || a.status === statusFilter
    const vaultOk  = vaultFilter === 'all' || a.vaultId === vaultFilter
    return statusOk && vaultOk
  })

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_CHIPS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              active={statusFilter === c.value}
              onClick={() => setStatusFilter(c.value)}
            />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {VAULT_CHIPS.map((c) => (
            <Chip
              key={c.value}
              label={c.label}
              active={vaultFilter === c.value}
              onClick={() => setVaultFilter(c.value)}
            />
          ))}
        </div>
      </div>

      {/* Analysis rows */}
      {filtered.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-v2-muted">
          No analyses match the current filter.
        </p>
      ) : (
        <Surface padding="none" radius="xl" className="divide-y divide-v2-border/40">
          {filtered.map((a) => {
            const chains = a.destinations
              .filter((d): d is { kind: 'onchain'; chain: ChainId; address: string; label?: string } => d.kind === 'onchain')
              .map((d) => d.chain)

            return (
              <Link
                key={a.id}
                href={`/cp/analyses/${a.id}`}
                className="group grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-2.5 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground md:grid-cols-[minmax(0,1.5fr)_auto_auto_minmax(0,1fr)_auto_auto_auto]"
              >
                {/* Name */}
                <code className="truncate font-mono text-[12.5px] text-v2-foreground">
                  {a.name}
                </code>

                {/* Version */}
                <VersionTag version={a.currentVersion} tone={analysisTone(a.status)} />

                {/* Status */}
                <StatusPill tone={ANALYSIS_STATUS_TONE[a.status]} size="xs">
                  {ANALYSIS_STATUS_LABEL[a.status]}
                </StatusPill>

                {/* Vault (md+) */}
                <span className="hidden truncate text-[12px] text-v2-muted md:block">
                  {a.vaultLabel}
                </span>

                {/* Trigger */}
                <code className="hidden shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/60 lg:block">
                  {fmtTrigger(a.trigger)}
                </code>

                {/* Chains */}
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                  {chains.map((c) => (
                    <ChainBadge key={c} chain={c} />
                  ))}
                </div>

                {/* Last exec */}
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/60">
                  {a.lastExecutedAt ? fmtRelative(a.lastExecutedAt) : '—'}
                </span>
              </Link>
            )
          })}
        </Surface>
      )}
    </div>
  )
}
