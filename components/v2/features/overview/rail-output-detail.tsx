'use client'

import type { PipelineNode } from './pipeline-types'
import { DefList, RailHeader, Section } from './rail-node-detail'

function fmtAbsolute(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(d)
}

function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  if (diffMs < 0) return 'in queue'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailOutputDetail({ node, onBack }: Props) {
  const totalNav = node.data.inputs.find((i) => i.label === 'nav')?.value ?? '—'
  const perShare = node.data.inputs.find((i) => i.label === 'nav/sh')?.value ?? '—'
  const deliveries = node.data.consumerDeliveries ?? []
  const isStale = node.data.status === 'failed'

  return (
    <div className="flex h-full flex-col">
      <RailHeader node={node} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] leading-relaxed text-v2-muted">
          {node.data.description}
        </p>

        <Section title="Live NAV">
          <div className="space-y-1">
            <p className="font-serif text-[28px] leading-none tracking-tight text-v2-foreground">
              {totalNav}
            </p>
            <p className="font-mono text-[14px] tabular-nums text-v2-foreground/80">
              {perShare} per share
            </p>
            <p
              className="font-mono text-[11px] tabular-nums text-v2-muted/70"
              suppressHydrationWarning
            >
              as of {fmtAbsolute(node.data.lastRunAt)}
              {isStale && (
                <span className="ml-1.5 inline-flex items-center rounded-sm border border-v2-danger/40 bg-v2-danger/10 px-1 py-px text-[10px] uppercase tracking-[0.1em] text-v2-danger">
                  stale
                </span>
              )}
            </p>
          </div>
        </Section>

        <Section title="Consumer deliveries">
          {deliveries.length === 0 ? (
            <p className="text-[11px] text-v2-muted/70">No subscribed consumers</p>
          ) : (
            <ul className="space-y-2.5">
              {deliveries.map((d) => (
                <li
                  key={d.name}
                  className="flex items-start justify-between gap-3 text-[12px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-v2-foreground">{d.name}</p>
                    <p className="truncate text-[10.5px] text-v2-muted/70">{d.network}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className="font-mono tabular-nums text-v2-foreground/80"
                      suppressHydrationWarning
                    >
                      {relativeTime(d.lastDeliveryAt)}
                    </p>
                    <p className="font-mono text-[10px] text-v2-muted/60">{d.payloadRef}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Inputs">
          <DefList items={node.data.inputs} />
        </Section>
        <Section title="Output">
          <DefList items={[node.data.output]} accent />
        </Section>
        <Section title="Provenance">
          <DefList
            items={[
              { label: 'Signing key', value: node.data.provenance.signingKey },
              { label: 'Proof type',  value: node.data.provenance.proofType },
              { label: 'Reference',   value: node.data.provenance.reference },
            ]}
          />
        </Section>
        <Section title="Schedule">
          <DefList
            items={[
              { label: 'Cadence',  value: node.data.cadence },
              { label: 'Last run', value: fmtAbsolute(node.data.lastRunAt) },
              { label: 'Next run', value: fmtAbsolute(node.data.nextRunAt) },
            ]}
          />
        </Section>
      </div>
    </div>
  )
}
