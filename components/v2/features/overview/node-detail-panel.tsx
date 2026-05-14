'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CardAura } from './card-aura'
import type { PipelineNode, PipelineStatus } from './pipeline-types'

interface NodeDetailPanelProps {
  node: PipelineNode | null
  onClose: () => void
}

const STATUS_PILL: Record<PipelineStatus, string> = {
  attested:
    'border-v2-success/30 bg-v2-success/10 text-v2-success',
  pending:
    'border-v2-warning/30 bg-v2-warning/10 text-v2-warning',
  failed:
    'border-v2-danger/40 bg-v2-danger/10 text-v2-danger',
}

const STATUS_LABEL: Record<PipelineStatus, string> = {
  attested: 'Attested',
  pending: 'Pending',
  failed: 'Failed',
}

function fmtAbsolute(iso: string): string {
  const d = new Date(iso)
  // Format as "May 14 · 14:23:00 UTC" — concise and unambiguous.
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

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  return (
    <AnimatePresence>
      {node && (
        <motion.aside
          key={node.id}
          initial={{ x: 32, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 16, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-2xl border border-v2-border/50 bg-v2-surface"
          aria-label={`${node.data.label} stage details`}
        >
          <CardAura variant="warm" id="node-detail-panel" blobX={70} blobY={8} />
          {/* Header */}
          <div className="relative z-10 flex shrink-0 items-center justify-between border-b border-v2-border/50 px-5 py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <h2 className="truncate text-[18px] font-medium leading-tight tracking-tight text-v2-foreground">
                {node.data.label}
              </h2>
              <span
                className={cn(
                  'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]',
                  STATUS_PILL[node.data.status]
                )}
              >
                <span className="h-1 w-1 rounded-full bg-current" />
                {STATUS_LABEL[node.data.status]}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={cn(
                'shrink-0 rounded-md p-1.5 text-v2-muted transition-colors',
                'hover:bg-v2-foreground/[0.05] hover:text-v2-foreground',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
              )}
              aria-label="Close stage details"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="relative z-10 flex-1 overflow-y-auto px-5 py-4">
            <p className="text-[13px] leading-relaxed text-v2-muted">
              {node.data.description}
            </p>

            <Section title="Inputs">
              <DefList
                items={node.data.inputs.map((i) => ({
                  label: i.label,
                  value: i.value,
                }))}
              />
            </Section>

            <Section title="Output">
              <DefList items={[node.data.output]} accent />
            </Section>

            <Section title="Provenance">
              <DefList
                items={[
                  { label: 'Signing key', value: node.data.provenance.signingKey },
                  { label: 'Proof type', value: node.data.provenance.proofType },
                  { label: 'Reference', value: node.data.provenance.reference },
                ]}
              />
            </Section>

            <Section title="Schedule">
              <DefList
                items={[
                  { label: 'Cadence', value: node.data.cadence },
                  { label: 'Last run', value: fmtAbsolute(node.data.lastRunAt) },
                  { label: 'Next run', value: fmtAbsolute(node.data.nextRunAt) },
                ]}
              />
            </Section>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-v2-border/40 pt-4 first-of-type:mt-5 first-of-type:border-t-0 first-of-type:pt-3">
      <p className="text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-v2-muted/60">
        {title}
      </p>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

function DefList({
  items,
  accent,
}: {
  items: { label: string; value: string }[]
  accent?: boolean
}) {
  return (
    <dl className="space-y-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-baseline justify-between gap-3 text-[12.5px]"
        >
          <dt className="shrink-0 text-v2-muted">{it.label}</dt>
          <dd
            className={cn(
              'min-w-0 flex-1 truncate text-right font-mono tabular-nums',
              accent ? 'font-medium text-v2-foreground' : 'text-v2-foreground/90'
            )}
            title={it.value}
          >
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
