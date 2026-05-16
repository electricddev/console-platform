import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill } from '@/components/v2/ui/status-pill'
import { ChainBadge } from '@/components/v2/features/cp/chain-badge'
import { SignatureBadge } from '@/components/v2/features/cp/signature-badge'
import { VersionTag, analysisTone } from '@/components/v2/features/cp/version-tag'
import {
  analyses,
  executions,
  type ChainId,
} from '@/components/v2/features/cp/cp-fixtures'
import {
  fmtRelative,
  fmtAbsolute,
  fmtLatency,
  ANALYSIS_STATUS_LABEL,
  ANALYSIS_STATUS_TONE,
  EXECUTION_STATUS_LABEL,
  EXECUTION_STATUS_TONE,
} from '@/components/v2/features/cp/cp-format'

// ── Derived stats ─────────────────────────────────────────────────────────────

const NOW = Date.now()
const H24 = 24 * 60 * 60 * 1000

const executing = analyses.filter((a) => a.status === 'approved_executing')
const inReview  = analyses.filter((a) => a.status === 'proposed' || a.status === 'changes_requested')

const execs24h  = executions.filter((e) => NOW - new Date(e.executedAt).getTime() < H24)
const failed24h = execs24h.filter((e) => e.status === 'failed')

// ── Needs attention items ─────────────────────────────────────────────────────

type AttentionRow =
  | { kind: 'changes_requested'; analysisId: string; analysisName: string; note: string }
  | { kind: 'denied';            analysisId: string; analysisName: string; note: string }
  | { kind: 'failed_exec';       execId: string;     analysisName: string; msg: string; at: string }

const attentionRows: AttentionRow[] = [
  ...analyses
    .filter((a) => a.status === 'changes_requested')
    .map((a) => {
      const note = a.versions.find((v) => v.decision === 'changes_requested')?.decisionNote ?? ''
      return {
        kind: 'changes_requested' as const,
        analysisId: a.id,
        analysisName: a.name,
        note,
      }
    }),
  ...analyses
    .filter((a) => a.status === 'denied')
    .map((a) => {
      const note = a.versions.find((v) => v.decision === 'denied')?.decisionNote ?? ''
      return {
        kind: 'denied' as const,
        analysisId: a.id,
        analysisName: a.name,
        note,
      }
    }),
  ...executions
    .filter((e) => e.status === 'failed' && NOW - new Date(e.executedAt).getTime() < H24 * 2)
    .slice(0, 3)
    .map((e) => ({
      kind: 'failed_exec' as const,
      execId: e.id,
      analysisName: e.analysisName,
      msg: e.payloadPreview,
      at: e.executedAt,
    })),
]

// ── In-flight analyses ────────────────────────────────────────────────────────

const inFlight = analyses.filter(
  (a) => a.status === 'draft' || a.status === 'proposed' || a.status === 'changes_requested',
)

// ── Recent signed executions ──────────────────────────────────────────────────

const recentSigned = executions
  .filter((e) => e.status === 'success' || e.status === 'partial')
  .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
  .slice(0, 10)

// ── Component ─────────────────────────────────────────────────────────────────

export default function CpHomePage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[11px] font-mono font-medium uppercase tracking-widest text-v2-muted/60">
          {'// HOME'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">
          Home
        </h1>
        <p className="mt-1 text-sm text-v2-muted">
          Health of your analyses and recent signed activity.
        </p>
      </div>

      {/* At a glance strip */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <GlanceCard label="Executing" value={executing.length} />
        <GlanceCard label="In review" value={inReview.length} />
        <GlanceCard label="Signed (24h)" value={execs24h.length} />
        <GlanceCard
          label="Failed (24h)"
          value={failed24h.length}
          warn={failed24h.length > 0}
        />
      </div>

      {/* Needs attention */}
      <section className="space-y-2">
        <h2 className="text-[13px] font-medium text-v2-foreground">Needs attention</h2>
        {attentionRows.length === 0 ? (
          <p className="text-[13px] text-v2-muted">All clear — nothing blocked.</p>
        ) : (
          <div className="flex flex-col divide-y divide-v2-border/50">
            {attentionRows.map((row, i) => (
              <AttentionRow key={i} row={row} />
            ))}
          </div>
        )}
      </section>

      {/* In flight */}
      <section className="space-y-2">
        <h2 className="text-[13px] font-medium text-v2-foreground">In flight</h2>
        {inFlight.length === 0 ? (
          <p className="text-[13px] text-v2-muted">No draft or pending analyses.</p>
        ) : (
          <Surface padding="none" radius="xl" className="divide-y divide-v2-border/40">
            {inFlight.map((a) => {
              const lastVersion = a.versions.at(-1)
              return (
                <Link
                  key={a.id}
                  href={`/cp/analyses/${a.id}`}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                >
                  <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-v2-foreground">
                    {a.name}
                  </code>
                  <VersionTag version={a.currentVersion} tone={analysisTone(a.status)} />
                  <StatusPill tone={ANALYSIS_STATUS_TONE[a.status]} size="xs">
                    {ANALYSIS_STATUS_LABEL[a.status]}
                  </StatusPill>
                  <span className="shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/60">
                    {lastVersion?.proposedAt ? fmtRelative(lastVersion.proposedAt) : '—'}
                  </span>
                </Link>
              )
            })}
          </Surface>
        )}
      </section>

      {/* Recently signed */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-v2-foreground">Recently signed</h2>
          <Link
            href="/cp/executions"
            className="group inline-flex items-center gap-1 text-[12px] text-v2-muted transition-colors hover:text-v2-foreground"
          >
            View all
            <ArrowRight
              className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        </div>
        <Surface padding="none" radius="xl" className="divide-y divide-v2-border/40">
          {recentSigned.map((e) => {
            const chains = e.destinations
              .filter((d): d is { kind: 'onchain'; chain: ChainId; txHash: string; blockNumber: number } => d.kind === 'onchain')
              .map((d) => d.chain)

            const analysis = analyses.find((a) => a.id === e.analysisId)
            const tone = analysis ? analysisTone(analysis.status) : 'executing'

            return (
              <div
                key={e.id}
                className="flex items-center gap-3 px-4 py-2 text-[12px]"
              >
                {/* Time */}
                <span
                  title={fmtAbsolute(e.executedAt)}
                  className="w-14 shrink-0 font-mono tabular-nums text-v2-muted/60"
                >
                  {fmtRelative(e.executedAt)}
                </span>

                {/* Analysis + version */}
                <Link
                  href={`/cp/analyses/${e.analysisId}`}
                  className="flex min-w-0 flex-1 items-center gap-1.5 truncate hover:text-v2-foreground"
                >
                  <code className="truncate font-mono text-[12px] text-v2-foreground">
                    {e.analysisName}
                  </code>
                  <VersionTag version={e.version} tone={tone} />
                </Link>

                {/* Chains */}
                <div className="hidden shrink-0 items-center gap-1 sm:flex">
                  {chains.map((c) => (
                    <ChainBadge key={c} chain={c} />
                  ))}
                </div>

                {/* Payload hash */}
                <div className="hidden shrink-0 md:block">
                  <SignatureBadge hash={e.payloadHash} verified />
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
        </Surface>
      </section>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GlanceCard({
  label,
  value,
  warn = false,
}: {
  label: string
  value: number
  warn?: boolean
}) {
  return (
    <Surface padding="none" radius="xl" className="p-4">
      <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-v2-muted/70">
        {label}
      </p>
      <p
        className={`mt-2 font-mono text-[28px] font-semibold leading-none tabular-nums ${
          warn && value > 0 ? 'text-v2-warning' : 'text-v2-foreground'
        }`}
      >
        {value}
      </p>
    </Surface>
  )
}

function AttentionRow({ row }: { row: AttentionRow }) {
  if (row.kind === 'changes_requested') {
    return (
      <Link
        href={`/cp/analyses/${row.analysisId}`}
        className="group flex items-start gap-3 py-2.5 transition-colors hover:bg-v2-foreground/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
      >
        <StatusPill tone="changes_requested" size="xs" className="mt-0.5 shrink-0">
          Changes requested
        </StatusPill>
        <div className="min-w-0 flex-1">
          <code className="font-mono text-[12.5px] text-v2-foreground">{row.analysisName}</code>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-v2-muted/70" title={row.note}>
            {row.note}
          </p>
        </div>
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v2-muted/30 transition-transform group-hover:translate-x-0.5 group-hover:text-v2-muted" strokeWidth={1.75} aria-hidden />
      </Link>
    )
  }

  if (row.kind === 'denied') {
    return (
      <Link
        href={`/cp/analyses/${row.analysisId}`}
        className="group flex items-start gap-3 py-2.5 transition-colors hover:bg-v2-foreground/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
      >
        <StatusPill tone="denied" size="xs" className="mt-0.5 shrink-0">
          Denied
        </StatusPill>
        <div className="min-w-0 flex-1">
          <code className="font-mono text-[12.5px] text-v2-foreground">{row.analysisName}</code>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-v2-muted/70" title={row.note}>
            {row.note}
          </p>
        </div>
        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-v2-muted/30 transition-transform group-hover:translate-x-0.5 group-hover:text-v2-muted" strokeWidth={1.75} aria-hidden />
      </Link>
    )
  }

  // failed_exec
  return (
    <div className="flex items-start gap-3 py-2.5">
      <StatusPill tone="danger" size="xs" className="mt-0.5 shrink-0">
        Failed
      </StatusPill>
      <div className="min-w-0 flex-1">
        <code className="font-mono text-[12.5px] text-v2-foreground">{row.analysisName}</code>
        <p
          className="mt-0.5 line-clamp-1 font-mono text-[11px] text-v2-muted/60"
          title={row.msg}
        >
          {row.msg}
        </p>
      </div>
      <span className="shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/50">
        {fmtRelative(row.at)}
      </span>
    </div>
  )
}
