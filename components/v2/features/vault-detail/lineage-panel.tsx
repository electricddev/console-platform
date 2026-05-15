'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  Globe,
  Zap,
  Upload,
  Webhook,
  MousePointer2,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtRelative } from '@/components/v2/features/origination/format'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { datasetAccess, datasetConfigs } from './data-fixture'
import type { Dataset, SyncMethod, SyncStatus } from './data-fixture'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'

// ── Node ids ──────────────────────────────────────────────────────────────────

const SOURCE_NODE = 'source'
const INGEST_NODE = 'ingest'
const DATASET_NODE = 'dataset'
const DESTINATION_NODE = 'destination'

function templateNodeId(id: string) {
  return `tpl::${id}`
}
function grantNodeId(counterparty: string) {
  return `grant::${counterparty}`
}

// ── Sync label helpers ────────────────────────────────────────────────────────

const SYNC_ICON: Record<SyncMethod, LucideIcon> = {
  scheduled: Clock,
  realtime: Zap,
  manual: Upload,
  api: Webhook,
  webhook: Webhook,
}

const SYNC_LABEL: Record<SyncMethod, string> = {
  scheduled: 'Scheduled',
  realtime: 'Real-time',
  manual: 'Manual upload',
  api: 'API push',
  webhook: 'Webhook',
}

const SYNC_STATUS_TONE: Record<SyncStatus, StatusTone> = {
  ok: 'success',
  warn: 'warning',
  fail: 'danger',
}

// ── Section heading (mirrors access-panel pattern) ────────────────────────────

function SectionHeading({ title, caption, id }: { title: string; caption: string; id?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="text-[13px] font-medium tracking-tight text-v2-foreground">{title}</h2>
      <p className="text-[12px] text-v2-muted">{caption}</p>
    </div>
  )
}

// ── Column header ─────────────────────────────────────────────────────────────

function ColHeader({ label }: { label: string }) {
  return (
    <div className="mb-2 h-4">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-v2-muted/50 select-none">
        {label}
      </span>
    </div>
  )
}

// ── Connector between two columns ─────────────────────────────────────────────

function ColConnector({ lit }: { lit: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 flex-col"
      style={{ width: 32 }}
    >
      {/* Spacer to match header row height */}
      <div className="h-6" />
      {/* Arrow centered at first node */}
      <div className="flex flex-1 items-start justify-center pt-[14px]">
        <ChevronRight
          className={cn(
            'h-3.5 w-3.5 transition-opacity duration-200',
            lit ? 'text-v2-foreground/30' : 'text-v2-foreground/12 opacity-30',
          )}
          strokeWidth={1.5}
        />
      </div>
    </div>
  )
}

// ── Lineage node ──────────────────────────────────────────────────────────────

interface NodeProps {
  nodeId: string
  highlight: boolean
  children: React.ReactNode
  emphasis?: boolean
  ariaLabel: string
  onHover: (id: string | null) => void
  className?: string
}

function LineageNode({
  nodeId,
  highlight,
  children,
  emphasis,
  ariaLabel,
  onHover,
  className,
}: NodeProps) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      onMouseEnter={() => onHover(nodeId)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(nodeId)}
      onBlur={() => onHover(null)}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-lg border p-3 outline-none cursor-default',
        'transition-all duration-200',
        'focus-visible:ring-2 focus-visible:ring-v2-foreground focus-visible:ring-offset-1',
        emphasis
          ? 'border-l-[2.5px] border-v2-success/50 border-t-v2-success/20 border-r-v2-success/20 border-b-v2-success/20 bg-v2-success/[0.035]'
          : 'border-v2-border/60 bg-v2-surface',
        highlight ? 'opacity-100' : 'opacity-[0.25]',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── Highlight computation ─────────────────────────────────────────────────────

function computeHighlighted(
  hovered: string | null,
  templateNodeIds: string[],
  grantPairs: Array<{ id: string; templateIds: string[] }>,
): Set<string> {
  if (!hovered) return new Set()

  const all = new Set<string>([
    SOURCE_NODE,
    INGEST_NODE,
    DATASET_NODE,
    DESTINATION_NODE,
    ...templateNodeIds,
    ...grantPairs.map((g) => g.id),
  ])

  if (hovered === DATASET_NODE) return all

  if (hovered === SOURCE_NODE || hovered === INGEST_NODE) {
    return new Set([SOURCE_NODE, INGEST_NODE, DATASET_NODE])
  }

  if (hovered === DESTINATION_NODE) {
    return new Set([SOURCE_NODE, INGEST_NODE, DATASET_NODE, DESTINATION_NODE])
  }

  if (hovered.startsWith('tpl::')) {
    const tplId = hovered.replace('tpl::', '')
    const affected = new Set<string>([SOURCE_NODE, INGEST_NODE, DATASET_NODE, hovered])
    for (const g of grantPairs) {
      if (g.templateIds.includes(tplId)) affected.add(g.id)
    }
    return affected
  }

  if (hovered.startsWith('grant::')) {
    const grant = grantPairs.find((g) => g.id === hovered)
    const affected = new Set<string>([
      SOURCE_NODE,
      INGEST_NODE,
      DATASET_NODE,
      hovered,
    ])
    if (grant) {
      for (const tid of grant.templateIds) {
        affected.add(templateNodeId(tid))
      }
    }
    return affected
  }

  return new Set([hovered])
}

// ── Main: LineagePanel ────────────────────────────────────────────────────────

interface LineagePanelProps {
  vault: Vault
  dataset: Dataset
}

export function LineagePanel({ vault, dataset }: LineagePanelProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const config = datasetConfigs[dataset.id]
  const access = datasetAccess[dataset.id]

  const templateNodeIds = useMemo(
    () => (access?.templates ?? []).map((t) => templateNodeId(t.id)),
    [access],
  )

  const grantPairs = useMemo(
    () =>
      (access?.grants ?? []).map((g) => ({
        id: grantNodeId(g.counterparty),
        templateIds: g.templateIds,
        counterparty: g.counterparty,
      })),
    [access],
  )

  const highlighted = useMemo(
    () => computeHighlighted(hovered, templateNodeIds, grantPairs),
    [hovered, templateNodeIds, grantPairs],
  )

  function isLit(id: string): boolean {
    if (!hovered) return true
    return highlighted.has(id)
  }

  const SyncIcon = config ? SYNC_ICON[config.syncMethod] : Clock
  const syncLabel = config ? SYNC_LABEL[config.syncMethod] : '—'
  const scheduleSubLabel =
    config?.syncMethod === 'scheduled'
      ? config.schedule
      : config?.syncMethod === 'realtime'
        ? 'Continuous'
        : null

  const templates = access?.templates ?? []
  const grants = access?.grants ?? []
  const counterpartyNames = grants.map((g) => g.counterparty)

  // Connector lit state
  const connectorSrcIngest = isLit(SOURCE_NODE) && isLit(INGEST_NODE)
  const connectorIngestDs = isLit(INGEST_NODE) && isLit(DATASET_NODE)
  const connectorDsTpl = isLit(DATASET_NODE) && templateNodeIds.some((id) => isLit(id))
  const connectorTplGrant =
    templateNodeIds.some((id) => isLit(id)) && grantPairs.some((g) => isLit(g.id))
  const connectorGrantDest = grantPairs.some((g) => isLit(g.id)) && isLit(DESTINATION_NODE)

  return (
    <div className="flex flex-col gap-8" suppressHydrationWarning>
      <SectionHeading
        title="Lineage"
        caption="End-to-end flow for this dataset. Hover any node to see what depends on it."
      />

      {/* ── Diagram ── */}
      <Surface radius="xl" className="p-5">
        <div
          role="group"
          aria-label="Dataset lineage diagram"
        >
          {/* Horizontal scroll wrapper */}
          <div className="overflow-x-auto">
            <div
              className="flex items-stretch"
              style={{ minWidth: 900 }}
            >
              {/* ── Col 1: Source ── */}
              <div className="flex flex-col" style={{ width: 148 }}>
                <ColHeader label="Source" />
                {config ? (
                  <LineageNode
                    nodeId={SOURCE_NODE}
                    highlight={isLit(SOURCE_NODE)}
                    ariaLabel={`Source: ${dataset.source}`}
                    onHover={setHovered}
                  >
                    <div className="flex items-start gap-1.5">
                      <span
                        className={cn(
                          'mt-[3px] h-1.5 w-1.5 shrink-0 rounded-full',
                          config.lastSyncStatus === 'ok'
                            ? 'bg-v2-success'
                            : config.lastSyncStatus === 'warn'
                              ? 'bg-v2-warning'
                              : 'bg-v2-danger',
                        )}
                        aria-hidden
                      />
                      <span className="text-[12px] font-medium text-v2-foreground leading-snug">
                        {dataset.source}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-v2-muted/60 leading-relaxed">
                      {dataset.sourceId}
                    </span>
                    <StatusPill
                      tone={SYNC_STATUS_TONE[config.lastSyncStatus]}
                      size="xs"
                      className="self-start"
                    >
                      {config.lastSyncStatus === 'ok' ? 'healthy' : config.lastSyncStatus}
                    </StatusPill>
                  </LineageNode>
                ) : (
                  <LineageNode
                    nodeId={SOURCE_NODE}
                    highlight={isLit(SOURCE_NODE)}
                    ariaLabel={`Source: ${dataset.source}`}
                    onHover={setHovered}
                  >
                    <span className="text-[12px] font-medium text-v2-foreground">{dataset.source}</span>
                    <span className="font-mono text-[10px] text-v2-muted/60">{dataset.sourceId}</span>
                  </LineageNode>
                )}
              </div>

              <ColConnector lit={connectorSrcIngest} />

              {/* ── Col 2: Ingestion ── */}
              <div className="flex flex-col" style={{ width: 148 }}>
                <ColHeader label="Ingestion" />
                {config ? (
                  <LineageNode
                    nodeId={INGEST_NODE}
                    highlight={isLit(INGEST_NODE)}
                    ariaLabel={`Ingestion: ${syncLabel}`}
                    onHover={setHovered}
                  >
                    <div className="flex items-center gap-1.5">
                      <SyncIcon
                        className="h-3 w-3 shrink-0 text-v2-muted/60"
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="text-[12px] font-medium text-v2-foreground leading-snug">
                        {syncLabel}
                      </span>
                    </div>
                    {scheduleSubLabel && (
                      <span className="text-[10.5px] text-v2-muted/70">{scheduleSubLabel}</span>
                    )}
                    <span
                      className="font-mono text-[10px] text-v2-muted/50"
                      suppressHydrationWarning
                    >
                      Last: {fmtRelative(config.lastSyncAt)}
                    </span>
                  </LineageNode>
                ) : (
                  <LineageNode
                    nodeId={INGEST_NODE}
                    highlight={isLit(INGEST_NODE)}
                    ariaLabel="Ingestion"
                    onHover={setHovered}
                  >
                    <span className="text-[12px] font-medium text-v2-foreground">—</span>
                  </LineageNode>
                )}
              </div>

              <ColConnector lit={connectorIngestDs} />

              {/* ── Col 3: Dataset (focal node) ── */}
              <div className="flex flex-col" style={{ width: 172 }}>
                <ColHeader label="Dataset" />
                <LineageNode
                  nodeId={DATASET_NODE}
                  highlight={isLit(DATASET_NODE)}
                  ariaLabel={`Dataset: ${dataset.name}`}
                  emphasis
                  onHover={setHovered}
                >
                  <span className="text-[13px] font-semibold text-v2-foreground leading-tight">
                    {dataset.name}
                  </span>
                  {dataset.ascClass && (
                    <span className="text-[10.5px] text-v2-muted/60">
                      ASC 820 · {dataset.ascClass}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-[10px] text-v2-muted/60 tabular-nums">
                      {dataset.recordCount.toLocaleString('en-US')} rows
                    </span>
                    <StatusPill
                      tone={
                        dataset.status === 'sealed'
                          ? 'success'
                          : dataset.status === 'pending'
                            ? 'warning'
                            : 'danger'
                      }
                      size="xs"
                    >
                      {dataset.status}
                    </StatusPill>
                  </div>
                </LineageNode>
              </div>

              <ColConnector lit={connectorDsTpl} />

              {/* ── Col 4: Templates ── */}
              <div className="flex min-w-0 flex-1 flex-col">
                <ColHeader label="Templates" />
                {templates.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-v2-border/40 p-3">
                    <span className="text-[11px] text-v2-muted/50">No templates</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5" style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {templates.map((tpl) => {
                      const nid = templateNodeId(tpl.id)
                      const consumers = grants
                        .filter((g) => g.templateIds.includes(tpl.id))
                        .map((g) => g.counterparty)
                      return (
                        <LineageNode
                          key={tpl.id}
                          nodeId={nid}
                          highlight={isLit(nid)}
                          ariaLabel={`Template: ${tpl.name}`}
                          onHover={setHovered}
                        >
                          <span className="text-[11.5px] font-medium text-v2-foreground leading-tight">
                            {tpl.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[9.5px] text-v2-muted/60 tabular-nums">
                              {tpl.runs7d} runs · 7d
                            </span>
                            <StatusPill
                              tone={
                                tpl.status === 'live'
                                  ? 'success'
                                  : tpl.status === 'draft'
                                    ? 'neutral'
                                    : 'warning'
                              }
                              size="xs"
                            >
                              {tpl.status}
                            </StatusPill>
                          </div>
                          {consumers.length > 0 && (
                            <span className="sr-only">
                              Consumed by: {consumers.join(', ')}
                            </span>
                          )}
                        </LineageNode>
                      )
                    })}
                  </div>
                )}
              </div>

              <ColConnector lit={connectorTplGrant} />

              {/* ── Col 5: Consumers ── */}
              <div className="flex min-w-0 flex-1 flex-col">
                <ColHeader label="Consumers" />
                {grants.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-v2-border/40 p-3">
                    <span className="text-[11px] text-v2-muted/50">No grants</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5" style={{ maxHeight: 380, overflowY: 'auto' }}>
                    {grants.map((grant) => {
                      const nid = grantNodeId(grant.counterparty)
                      const grantTone: StatusTone =
                        grant.status === 'active'
                          ? 'success'
                          : grant.status === 'paused'
                            ? 'warning'
                            : 'neutral'
                      const grantedTemplateNames = grant.templateIds
                        .map((tid) => templates.find((t) => t.id === tid)?.name ?? tid)
                      return (
                        <LineageNode
                          key={grant.counterparty}
                          nodeId={nid}
                          highlight={isLit(nid)}
                          ariaLabel={`Consumer: ${grant.counterparty}`}
                          onHover={setHovered}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[11.5px] font-medium text-v2-foreground leading-tight truncate">
                              {grant.counterparty}
                            </span>
                            <StatusPill tone={grantTone} size="xs">
                              {grant.status}
                            </StatusPill>
                          </div>
                          <span className="font-mono text-[9.5px] text-v2-muted/60">
                            {grant.rateLimit}
                          </span>
                          {grantedTemplateNames.length > 0 && (
                            <span className="sr-only">
                              Templates granted: {grantedTemplateNames.join(', ')}
                            </span>
                          )}
                        </LineageNode>
                      )
                    })}
                  </div>
                )}
              </div>

              <ColConnector lit={connectorGrantDest} />

              {/* ── Col 6: On-chain destination ── */}
              <div className="flex flex-col" style={{ width: 130 }}>
                <ColHeader label="On-chain" />
                <LineageNode
                  nodeId={DESTINATION_NODE}
                  highlight={isLit(DESTINATION_NODE)}
                  ariaLabel="On-chain destination: Ethereum mainnet"
                  onHover={setHovered}
                >
                  <div className="flex items-center gap-1.5">
                    <Globe
                      className="h-3 w-3 shrink-0 text-v2-muted/60"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="text-[12px] font-medium text-v2-foreground leading-snug">
                      Ethereum
                    </span>
                  </div>
                  <span className="text-[10.5px] text-v2-muted/60">mainnet</span>
                </LineageNode>
              </div>
            </div>
          </div>

          {/* Hover hint */}
          {!hovered && (
            <div
              className="mt-4 flex items-center gap-1.5 text-[10.5px] text-v2-muted/35 select-none"
              aria-hidden
            >
              <MousePointer2 className="h-3 w-3 shrink-0" strokeWidth={1.75} />
              Hover any node to highlight its connections
            </div>
          )}
        </div>
      </Surface>

      {/* ── Impact summary ── */}
      <Surface radius="xl" className="p-4">
        <p className="text-[12.5px] leading-relaxed text-v2-muted">
          If{' '}
          <Link
            href={`/v2/vaults/${vault.id}/sources/${dataset.sourceId}`}
            className="font-medium text-v2-foreground/90 underline underline-offset-2 transition-colors hover:text-v2-foreground"
          >
            {dataset.source}
          </Link>{' '}
          stops delivering data, the{' '}
          <strong className="font-medium text-v2-foreground">{dataset.name}</strong>{' '}
          dataset&apos;s seal will fail, breaking{' '}
          <strong className="font-medium text-v2-foreground">
            {templates.length}{' '}
            {templates.length === 1 ? 'query template' : 'query templates'}
          </strong>
          {grants.length > 0 && (
            <>
              {' '}and{' '}
              <strong className="font-medium text-v2-foreground">
                {grants.length}{' '}
                {grants.length === 1 ? 'counterparty integration' : 'counterparty integrations'}
              </strong>
              {' '}—{' '}
              {counterpartyNames.map((name, i) => {
                const slug = name.toLowerCase().replace(/\s+/g, '-')
                return (
                  <span key={name}>
                    <Link
                      href={`/v2/vaults/${vault.id}/access?counterparty=${slug}`}
                      className="font-medium text-v2-foreground/90 underline underline-offset-2 transition-colors hover:text-v2-foreground"
                    >
                      {name}
                    </Link>
                    {i < counterpartyNames.length - 1
                      ? i === counterpartyNames.length - 2
                        ? ', and '
                        : ', '
                      : null}
                  </span>
                )
              })}
            </>
          )}
          .
        </p>
        {grants.length === 0 && templates.length === 0 && (
          <p className="mt-2 text-[11px] text-v2-muted/50">
            No query templates or counterparty integrations are connected to this dataset yet.
          </p>
        )}
      </Surface>
    </div>
  )
}
