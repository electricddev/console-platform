import React from 'react'
import Link from 'next/link'
import { ShieldCheck, ShieldOff, Layers, Hash, ArrowRight } from 'lucide-react'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Run } from '@/lib/api/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  runs: Run[]
  /** Reference "today" in ms — for grouping by day relative to now. */
  now: number
  className?: string
  /** Limit visible entries (default 8). */
  limit?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function humanizeTemplateId(templateId: string): string {
  return templateId
    .replace(/^tpl_/, '')
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
}

function shortRunId(id: string): string {
  return `#${id.replace(/^run_/, '').slice(0, 4)}`
}

/**
 * Returns a day bucket key (YYYY-MM-DD) based on the provided reference time
 * so grouping is stable across server renders.
 */
function dayBucket(iso: string, nowMs: number): string {
  const d = new Date(iso)
  // Align to local calendar day relative to `now`
  return d.toLocaleDateString('en-CA') // "YYYY-MM-DD"
}

function dayLabel(bucket: string, nowMs: number): string {
  const now = new Date(nowMs)
  const today = now.toLocaleDateString('en-CA')
  const yesterday = new Date(nowMs - 86_400_000).toLocaleDateString('en-CA')

  if (bucket === today) return 'Today'
  if (bucket === yesterday) return 'Yesterday'

  const diffMs = new Date(today).getTime() - new Date(bucket).getTime()
  const diffDays = Math.round(diffMs / 86_400_000)
  if (diffDays <= 6) return `${diffDays} days ago`

  // Older — show "Wed 30 Apr"
  const d = new Date(bucket + 'T12:00:00')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

const PULSE_STATUSES = new Set<Run['status']>(['running', 'queued', 'attesting', 'anchoring'])

function statusNodeClass(status: Run['status'], hasAttestation: boolean): string {
  if (status === 'completed' || (status === 'anchoring' && hasAttestation)) {
    return 'bg-success'
  }
  if (status === 'failed') return 'bg-destructive'
  if (status === 'disputed') return 'bg-warning'
  return 'bg-info'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type EntryProps = {
  run: Run
  isFirst: boolean
  isLast: boolean
  isNewest: boolean
}

function LedgerEntry({ run, isFirst, isLast, isNewest }: EntryProps) {
  const attest = run.attestation
  const hasPulse = PULSE_STATUSES.has(run.status)
  const nodeColor = statusNodeClass(run.status, !!attest)
  const isAnchored = !!(attest?.anchorTxHash)

  return (
    <li
      className={cn(
        'grid grid-cols-[2.25rem_1fr] gap-x-4 transition-colors hover:bg-muted/30 active:translate-y-px',
      )}
    >
      {/* ── Rail column ── */}
      <div className="relative flex flex-col items-center py-3">
        {/* Line above node (all entries except the first in a group) */}
        {!isFirst && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-1/2 -translate-x-px w-px bg-border/60"
            style={{ height: '0.75rem' }}
          />
        )}

        {/* Status node */}
        <span
          className={cn(
            'relative z-10 mt-0 size-3 rounded-full flex-shrink-0',
            nodeColor,
            hasPulse && 'pulse-soft',
          )}
        />

        {/* Line below node (all entries except the last in a group) */}
        {!isLast && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 -translate-x-px w-px bg-border/60"
            style={{ top: '1.5rem', bottom: 0 }}
          />
        )}
      </div>

      {/* ── Content column ── */}
      <div
        className={cn(
          'min-w-0 rounded-md py-3 pr-2 pl-1',
          isNewest && 'surface-glass ring-accent-soft shimmer',
        )}
      >
        {/* Title row */}
        <div className="flex min-w-0 items-center gap-2">
          {isNewest && (
            <span className="flex-shrink-0 font-tag text-[0.6rem] text-accent">// most recent</span>
          )}
          <Link
            href={`/runs/${run.id}`}
            className="group flex min-w-0 items-baseline gap-2 hover:underline underline-offset-2"
          >
            <span className="truncate text-[0.95rem] font-medium text-foreground">
              {humanizeTemplateId(run.templateId)}
            </span>
            <span className="flex-shrink-0 font-mono text-[0.65rem] tabular-nums text-foreground/45">
              {shortRunId(run.id)}
            </span>
          </Link>
        </div>

        {/* Sub-line */}
        <p className="mt-0.5 font-mono text-[0.72rem] tabular-nums text-muted-foreground">
          on {run.datasetId}
          {run.durationMs != null ? ` · ${fmtDuration(run.durationMs)}` : ''}
          {' · '}
          {fmtRelativeTime(run.queuedAt)}
        </p>

        {/* Evidence row — attested runs */}
        {attest && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[0.7rem]">
            {/* TEE measurement */}
            <span className="flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="size-3.5 text-success" strokeWidth={1.75} />
              <span className="font-tag text-foreground/55">TEE</span>
              <CopyableHash value={attest.teeMeasurement} short />
            </span>

            {/* Output signature */}
            <span className="flex items-center gap-1 text-muted-foreground">
              <Hash className="size-3.5 text-foreground/45" strokeWidth={1.75} />
              <span className="font-tag text-foreground/55">out</span>
              <CopyableHash value={attest.outputSignature} short />
            </span>

            {/* On-chain anchor pill */}
            {isAnchored && attest.anchorTxHash && (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/8 px-2 py-0.5 text-accent">
                <Layers className="size-3.5" strokeWidth={1.75} />
                <span>{attest.anchorChain ?? 'chain'}</span>
                {attest.anchorBlockNumber != null && (
                  <span>block #{attest.anchorBlockNumber}</span>
                )}
                <CopyableHash value={attest.anchorTxHash} short />
              </span>
            )}
          </div>
        )}

        {/* No-attestation caption — failed runs */}
        {!attest && run.status === 'failed' && (
          <span className="mt-2 inline-flex items-center gap-1 text-[0.7rem] text-muted-foreground">
            <ShieldOff className="size-3.5" strokeWidth={1.75} />
            <span className="font-tag">// no attestation</span>
            {run.error && (
              <span className="font-mono text-[0.7rem] text-muted-foreground">· {run.error}</span>
            )}
          </span>
        )}
      </div>
    </li>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TrustLedger({ runs, now, className, limit = 8 }: Props): React.ReactElement {
  // Sort descending by queuedAt
  const sorted = [...runs].sort(
    (a, b) => new Date(b.queuedAt).getTime() - new Date(a.queuedAt).getTime(),
  )

  const visible = sorted.slice(0, limit)
  const overflow = sorted.length - visible.length
  const anchoredCount = runs.filter((r) => !!r.attestation?.anchorTxHash).length
  const n = Math.min(runs.length, limit)

  // ── Group by day bucket ──
  type DayGroup = { bucket: string; label: string; entries: Run[] }
  const groups: DayGroup[] = []
  for (const run of visible) {
    const bucket = dayBucket(run.queuedAt, now)
    const last = groups[groups.length - 1]
    if (last && last.bucket === bucket) {
      last.entries.push(run)
    } else {
      groups.push({ bucket, label: dayLabel(bucket, now), entries: [run] })
    }
  }

  // Empty state
  if (runs.length === 0) {
    return (
      <section aria-labelledby="trust-ledger" className={cn('grid gap-3', className)}>
        <header className="flex items-baseline justify-between border-b border-border pb-3">
          <h3 id="trust-ledger" className="font-display text-2xl tracking-tight">
            Trust ledger
          </h3>
        </header>
        <div className="py-12 text-center">
          <p className="font-display text-lg italic text-muted-foreground">
            No anchored runs yet.
          </p>
          <p className="mt-1 text-[0.8rem] text-muted-foreground/70">
            Runs will appear here as they execute and are attested by the TEE.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="trust-ledger" className={cn('grid', className)}>
      {/* ── Header ── */}
      <header className="flex items-baseline justify-between border-b border-border pb-3">
        <div className="flex flex-col gap-0.5">
          <h3 id="trust-ledger" className="font-display text-2xl tracking-tight">
            Trust ledger
          </h3>
          <span className="font-tag text-foreground/55">
            {'// last '}{n}{' runs · '}{anchoredCount}/{n}{' anchored on-chain'}
          </span>
        </div>
        <Link
          href="/runs"
          className="flex items-center gap-1 font-tag text-foreground/55 transition-colors hover:text-foreground"
        >
          {'// view all'}
          <ArrowRight className="size-3" strokeWidth={1.75} />
        </Link>
      </header>

      {/* ── Decorative tick rule ── */}
      <div className="tick-rule-x mask-fade-x h-1.5 mt-1 mb-2" aria-hidden />

      {/* ── Day-grouped timeline ── */}
      <ol className="grid gap-0">
        {groups.map((group, gi) => {
          const isLastGroup = gi === groups.length - 1

          return (
            <li key={group.bucket}>
              {/* Day separator between groups (not before first) */}
              {gi > 0 && (
                <div className="mt-4 border-t border-border/60" />
              )}

              {/* Day header */}
              <div className="mt-3 mb-1 flex items-center gap-0">
                <span className="font-tag text-foreground/55">{group.label}</span>
                <span className="ml-3 h-px flex-1 bg-border" aria-hidden />
              </div>

              {/* Entries for this day */}
              <ol className="grid">
                {group.entries.map((run, ei) => {
                  const isFirst = ei === 0
                  const isLast = ei === group.entries.length - 1
                  // The globally newest entry is group[0].entries[0]
                  const isNewest = gi === 0 && ei === 0

                  return (
                    <LedgerEntry
                      key={run.id}
                      run={run}
                      isFirst={isFirst}
                      isLast={isLast}
                      isNewest={isNewest}
                    />
                  )
                })}
              </ol>
            </li>
          )
        })}
      </ol>

      {/* ── Overflow indicator ── */}
      {overflow > 0 && (
        <div className="mt-4 border-t border-border/60 pt-3">
          <Link
            href="/runs"
            className="font-tag text-foreground/55 transition-colors hover:text-foreground"
          >
            {'// + '}{overflow}{' more runs in the ledger'}
          </Link>
        </div>
      )}

      {/* ── End-of-ledger marker (only when all runs are visible) ── */}
      {overflow === 0 && runs.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <span className="h-px flex-1 bg-border/60" aria-hidden />
          <span className="font-tag text-foreground/45">// end of ledger</span>
          <span className="h-px flex-1 bg-border/60" aria-hidden />
        </div>
      )}
    </section>
  )
}
