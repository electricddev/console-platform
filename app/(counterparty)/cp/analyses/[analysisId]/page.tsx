import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Play, MoreHorizontal } from 'lucide-react'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill } from '@/components/v2/ui/status-pill'
import { ChainBadge } from '@/components/v2/features/cp/chain-badge'
import { HashMono } from '@/components/v2/features/cp/hash-mono'
import { SignatureBadge } from '@/components/v2/features/cp/signature-badge'
import { VersionTag, analysisTone, versionTone } from '@/components/v2/features/cp/version-tag'
import {
  findAnalysis,
  executionsFor,
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
  fmtTriggerHuman,
} from '@/components/v2/features/cp/cp-format'

type Params = { analysisId: string }

export default async function AnalysisDetailPage({ params }: { params: Promise<Params> }) {
  const { analysisId } = await params
  const analysis = findAnalysis(analysisId)
  if (!analysis) notFound()

  const currentVersion = analysis.versions.find((v) => v.v === analysis.currentVersion)
  const recentExecs = executionsFor(analysis.id, 5)

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div>
        <p className="text-[11px] font-mono font-medium uppercase tracking-widest text-v2-muted/60">
          {'// ANALYSES'}
        </p>
        <div className="mt-1 flex flex-wrap items-start gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight text-v2-foreground">
            {analysis.name}
          </h1>
          <div className="flex items-center gap-2 pt-1">
            <VersionTag version={analysis.currentVersion} tone={analysisTone(analysis.status)} />
            <StatusPill tone={ANALYSIS_STATUS_TONE[analysis.status]}>
              {ANALYSIS_STATUS_LABEL[analysis.status]}
            </StatusPill>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] text-v2-muted">
          <span>{analysis.provider.name}</span>
          <span className="text-v2-border">·</span>
          <Link
            href="/cp/vaults"
            className="hover:text-v2-foreground transition-colors"
          >
            {analysis.vaultLabel}
          </Link>
        </div>
        {/* Action buttons — visual only */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md border border-v2-border/60 bg-v2-surface px-3 py-1.5 font-mono text-[12px] text-v2-muted transition-all hover:border-v2-border hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
          >
            <Play className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
            Run now
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-v2-border/60 bg-v2-surface text-v2-muted transition-all hover:border-v2-border hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
            aria-label="More options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Code ── */}
      {currentVersion && (
        <section className="space-y-2">
          <h2 className="text-[13px] font-medium text-v2-foreground">Code</h2>
          <Surface padding="none" radius="xl" className="overflow-x-auto">
            <pre className="p-4 font-mono text-[11.5px] leading-relaxed text-v2-muted/90 whitespace-pre">
              {currentVersion.code}
            </pre>
          </Surface>
        </section>
      )}

      {/* ── Versions ── */}
      <section className="space-y-2">
        <h2 className="text-[13px] font-medium text-v2-foreground">Versions</h2>
        <Surface padding="none" radius="xl" className="divide-y divide-v2-border/40">
          {[...analysis.versions].reverse().map((v) => (
            <div key={v.v} className="flex flex-wrap items-start gap-3 px-4 py-3">
              <VersionTag version={v.v} tone={versionTone(v.status)} />
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11.5px] tabular-nums text-v2-muted/60">
                    Proposed {fmtRelative(v.proposedAt)}
                  </span>
                  {v.decidedAt && (
                    <>
                      <span className="text-v2-border">·</span>
                      <span
                        className="font-mono text-[11.5px] tabular-nums text-v2-muted/60"
                        title={fmtAbsolute(v.decidedAt)}
                      >
                        Decided {fmtRelative(v.decidedAt)}
                      </span>
                    </>
                  )}
                  {v.reviewer && (
                    <>
                      <span className="text-v2-border">·</span>
                      <span className="text-[12px] text-v2-muted">
                        {v.reviewer.name} · {v.reviewer.org}
                      </span>
                    </>
                  )}
                </div>
                {v.decisionNote && (
                  <p
                    className="line-clamp-2 text-[12px] text-v2-muted/70"
                    title={v.decisionNote}
                  >
                    {v.decisionNote}
                  </p>
                )}
              </div>
              {v.decision && (
                <span
                  className={`shrink-0 rounded px-1.5 py-px font-mono text-[10.5px] font-medium ${
                    v.decision === 'approved'
                      ? 'bg-v2-success/[0.1] text-v2-success'
                      : v.decision === 'denied'
                        ? 'bg-v2-foreground/[0.06] text-v2-muted'
                        : 'bg-v2-warning/[0.10] text-v2-warning'
                  }`}
                >
                  {v.decision === 'changes_requested' ? 'changes req.' : v.decision}
                </span>
              )}
            </div>
          ))}
        </Surface>
      </section>

      {/* ── Trigger + Destinations ── side by side on wider screens */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Trigger */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-medium text-v2-foreground">Trigger</h2>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1 font-mono text-[11px] text-v2-muted transition-all hover:border-v2-border hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
            >
              <Play className="h-3 w-3" strokeWidth={1.75} aria-hidden="true" />
              Run now
            </button>
          </div>
          <Surface padding="none" radius="xl" className="px-4 py-3">
            <p className="text-[13px] text-v2-foreground">
              {fmtTriggerHuman(analysis.trigger)}
            </p>
            {analysis.trigger.kind === 'cron' && (
              <code className="mt-1 block font-mono text-[11px] text-v2-muted/60">
                {analysis.trigger.expr}
              </code>
            )}
          </Surface>
        </section>

        {/* Destinations */}
        <section className="space-y-2">
          <h2 className="text-[13px] font-medium text-v2-foreground">Destinations</h2>
          <Surface padding="none" radius="xl" className="divide-y divide-v2-border/40">
            {analysis.destinations.length === 0 ? (
              <p className="px-4 py-3 text-[13px] text-v2-muted">No destinations configured.</p>
            ) : (
              analysis.destinations.map((dest, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  {dest.kind === 'onchain' ? (
                    <>
                      <ChainBadge chain={dest.chain} />
                      <HashMono value={dest.address} className="flex-1" />
                      {dest.label && (
                        <span className="text-[12px] text-v2-muted/60">{dest.label}</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-v2-muted/60 border border-v2-border/40 rounded px-1.5 py-px">
                        HTTP
                      </span>
                      <span
                        className="min-w-0 flex-1 truncate font-mono text-[11px] text-v2-muted/80"
                        title={dest.url}
                      >
                        {dest.url}
                      </span>
                      {dest.label && (
                        <span className="shrink-0 text-[12px] text-v2-muted/60">{dest.label}</span>
                      )}
                    </>
                  )}
                </div>
              ))
            )}
          </Surface>
        </section>
      </div>

      {/* ── Recent executions ── */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-v2-foreground">Recent executions</h2>
          <Link
            href={`/cp/executions?analysis=${analysis.id}`}
            className="group inline-flex items-center gap-1 text-[12px] text-v2-muted transition-colors hover:text-v2-foreground"
          >
            View all in Executions
            <ArrowRight
              className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden="true"
            />
          </Link>
        </div>

        {recentExecs.length === 0 ? (
          <p className="text-[13px] text-v2-muted">No executions yet.</p>
        ) : (
          <Surface padding="none" radius="xl" className="divide-y divide-v2-border/40">
            {recentExecs.map((e) => {
              const chains = e.destinations
                .filter((d): d is { kind: 'onchain'; chain: ChainId; txHash: string; blockNumber: number } => d.kind === 'onchain')
                .map((d) => d.chain)

              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-[12px]">
                  {/* Time */}
                  <span
                    title={fmtAbsolute(e.executedAt)}
                    className="w-14 shrink-0 font-mono tabular-nums text-v2-muted/60"
                  >
                    {fmtRelative(e.executedAt)}
                  </span>

                  {/* Analysis + version */}
                  <VersionTag version={e.version} tone={analysisTone(analysis.status)} />

                  {/* Chains */}
                  <div className="flex shrink-0 items-center gap-1">
                    {chains.map((c) => (
                      <ChainBadge key={c} chain={c} />
                    ))}
                  </div>

                  {/* Payload hash */}
                  <div className="hidden flex-1 md:block">
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

                  {/* Payload preview (error or first fields) */}
                  <code
                    className="hidden max-w-[200px] truncate font-mono text-[11px] text-v2-muted/50 xl:block"
                    title={e.payloadPreview}
                  >
                    {e.payloadPreview}
                  </code>
                </div>
              )
            })}
          </Surface>
        )}
      </section>
    </div>
  )
}

export async function generateStaticParams() {
  const { analyses } = await import('@/components/v2/features/cp/cp-fixtures')
  return analyses.map((a) => ({ analysisId: a.id }))
}
