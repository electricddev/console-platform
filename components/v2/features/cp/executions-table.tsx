'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { StatusPill } from '@/components/v2/ui/status-pill'
import { ChainBadge } from './chain-badge'
import { SignatureBadge } from './signature-badge'
import { VersionTag, analysisTone } from './version-tag'
import {
  type Execution,
  type Analysis,
  type ChainId,
} from './cp-fixtures'
import {
  fmtRelative,
  fmtAbsolute,
  fmtLatency,
  EXECUTION_STATUS_LABEL,
  EXECUTION_STATUS_TONE,
} from './cp-format'

// Filter chip visuals — static for v1. Only the ?analysis= param wires active state.
// Document: status/chain/range chips are visual-only (no behavior). The analysis
// chip reads the ?analysis= query param and marks itself active when present.

function Chip({
  label,
  active,
  className,
}: {
  label: string
  active: boolean
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-md border px-2.5 font-mono text-[11px] tracking-tight',
        active
          ? 'border-v2-foreground/30 bg-v2-foreground/[0.08] text-v2-foreground'
          : 'border-v2-border/50 bg-transparent text-v2-muted/60',
        className,
      )}
    >
      {label}
    </span>
  )
}

export function ExecutionsTable({
  executions,
  analyses,
}: {
  executions: Execution[]
  analyses: Analysis[]
}) {
  const searchParams = useSearchParams()
  const activeAnalysisId = searchParams.get('analysis') ?? null

  // Filter: if ?analysis= is set, filter to that analysis only
  const filtered = activeAnalysisId
    ? executions.filter((e) => e.analysisId === activeAnalysisId)
    : executions

  // Sort newest first
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime(),
  )

  return (
    <div className="space-y-4">
      {/* Filter chips */}
      <div className="space-y-2">
        {/* Analysis chips */}
        <div className="flex flex-wrap gap-1.5">
          <Chip label="All analyses" active={!activeAnalysisId} />
          {analyses
            .filter((a) => a.status === 'approved_executing')
            .map((a) => (
              <Link key={a.id} href={`/cp/executions?analysis=${a.id}`}>
                <Chip
                  label={a.name}
                  active={activeAnalysisId === a.id}
                  className="cursor-pointer hover:border-v2-border hover:text-v2-foreground"
                />
              </Link>
            ))}
          {activeAnalysisId && (
            <Link href="/cp/executions">
              <Chip
                label="clear filter ×"
                active={false}
                className="cursor-pointer hover:border-v2-border hover:text-v2-foreground"
              />
            </Link>
          )}
        </div>

        {/* Chain / status / range chips — visual only */}
        <div className="flex flex-wrap gap-1.5">
          {['All chains', 'ETH', 'BASE', 'ARB'].map((c) => (
            <Chip key={c} label={c} active={c === 'All chains'} />
          ))}
          <span className="mx-1 self-center text-v2-border">·</span>
          {['All statuses', 'Signed', 'Partial', 'Failed'].map((s) => (
            <Chip key={s} label={s} active={s === 'All statuses'} />
          ))}
          <span className="mx-1 self-center text-v2-border">·</span>
          {['7d', '24h', '30d'].map((r) => (
            <Chip key={r} label={r} active={r === '7d'} />
          ))}
        </div>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-v2-muted">
          No executions match the current filter.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-v2-border/40 rounded-xl border border-v2-border/60 bg-v2-surface">
          {sorted.map((e) => {
            const chains = e.destinations
              .filter((d): d is { kind: 'onchain'; chain: ChainId; txHash: string; blockNumber: number } => d.kind === 'onchain')
              .map((d) => d.chain)

            const analysis = analyses.find((a) => a.id === e.analysisId)
            const tone = analysis ? analysisTone(analysis.status) : 'executing'

            return (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-[7px] text-[12px]"
              >
                {/* Time */}
                <span
                  title={fmtAbsolute(e.executedAt)}
                  className="w-[52px] shrink-0 font-mono tabular-nums text-v2-muted/60"
                >
                  {fmtRelative(e.executedAt)}
                </span>

                {/* Analysis name + version */}
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <Link
                    href={`/cp/analyses/${e.analysisId}`}
                    className="truncate font-mono text-[12px] text-v2-foreground hover:underline"
                  >
                    {e.analysisName}
                  </Link>
                  <VersionTag version={e.version} tone={tone} />
                </div>

                {/* Chains */}
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                  {chains.length > 0 ? (
                    chains.map((c) => <ChainBadge key={c} chain={c} />)
                  ) : (
                    <span className="font-mono text-[11px] text-v2-muted/40">—</span>
                  )}
                </div>

                {/* Signature / payload hash */}
                <div className="hidden shrink-0 md:block">
                  <SignatureBadge hash={e.payloadHash} verified={e.status !== 'failed'} />
                </div>

                {/* Latency */}
                <span className="hidden w-12 shrink-0 text-right font-mono tabular-nums text-v2-muted/60 lg:block">
                  {fmtLatency(e.latencyMs)}
                </span>

                {/* Status */}
                <StatusPill tone={EXECUTION_STATUS_TONE[e.status]} size="xs">
                  {EXECUTION_STATUS_LABEL[e.status]}
                </StatusPill>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
