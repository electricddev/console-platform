'use client'

import { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { connectorById } from '../../catalog-data'
import { samplePreviewFor, type SamplePreview } from '../sample-rows'
import { ModalActionBar } from '../modal-action-bar'
import type { DiscoveredDataset } from '../setup-reducer'

type Props = {
  connectorId: string
  discovered: DiscoveredDataset[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onToggleAll: () => void
  onConfirm: () => void
  onCancel: () => void
  submitting?: boolean
}

export function ConfirmStep({
  connectorId,
  discovered,
  selectedIds,
  onToggle,
  onToggleAll,
  onConfirm,
  onCancel,
  submitting,
}: Props) {
  const def = connectorById(connectorId)
  const allSelected = selectedIds.length === discovered.length
  const noneSelected = selectedIds.length === 0
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const estimate = useMemo(() => {
    return discovered
      .filter((d) => selectedIds.includes(d.id))
      .reduce((sum, d) => sum + (d.rowCount ?? 0), 0)
  }, [discovered, selectedIds])

  return (
    <>
      {/* Stage */}
      <div className="px-6 pt-5 pb-3">
        {/* Header row: count + badge || toggle link */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5">
            <p className="font-mono text-[11px] text-v2-muted">
              <span className="font-semibold text-v2-foreground">
                {selectedIds.length}
              </span>{' '}
              of {discovered.length} selected
            </p>
            {estimate > 0 ? (
              <Badge
                variant="outline"
                className="font-mono text-[10.5px] px-1.5 py-0.5"
              >
                ~{formatRows(estimate)} rows / month
              </Badge>
            ) : null}
          </div>
          <Button variant="link" size="sm" onClick={onToggleAll} className="h-auto p-0 text-[11.5px]">
            {allSelected ? 'Clear all' : 'Select all'}
          </Button>
        </div>

        {/* Dataset list */}
        <ul className="flex flex-col gap-1.5">
          {discovered.map((d) => {
            const checked = selectedIds.includes(d.id)
            const expanded = expandedId === d.id
            const preview = samplePreviewFor(connectorId, d.id)
            return (
              <li
                key={d.id}
                className={cn(
                  'rounded-md border transition-colors overflow-hidden',
                  checked
                    ? 'border-v2-green/40 bg-v2-green-soft/50 ring-1 ring-inset ring-v2-green/20'
                    : 'border-v2-border bg-transparent hover:border-v2-border/80 hover:bg-v2-foreground/[0.02]',
                )}
              >
                <div className="flex items-center gap-3 px-3.5 py-3">
                  {/* Clickable row region for toggle */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onToggle(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onToggle(d.id)
                      }
                    }}
                    aria-pressed={checked}
                    className="flex flex-1 cursor-pointer items-center gap-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                  >
                    <Checkbox
                      checked={checked}
                      aria-label={`Select ${d.name}`}
                      className="size-4 pointer-events-none"
                      tabIndex={-1}
                    />
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-[12.5px] text-v2-foreground">
                        {d.name}
                      </span>
                      {d.subtitle ? (
                        <span className="block truncate text-[11px] text-v2-muted">
                          {d.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {/* Expand/collapse chevron */}
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={`${expanded ? 'Hide' : 'Show'} sample for ${d.name}`}
                    onClick={() => setExpandedId(expanded ? null : d.id)}
                    className="rounded-md p-1 text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
                    disabled={!preview}
                  >
                    <ChevronDown
                      className={cn(
                        'size-3.5 transition-transform duration-150',
                        expanded && 'rotate-180',
                      )}
                      strokeWidth={2}
                    />
                  </button>
                </div>

                {/* Sample preview — animated expand */}
                <AnimatePresence initial={false}>
                  {expanded ? (
                    <motion.div
                      key="sample"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      style={{ overflow: 'hidden' }}
                    >
                      {preview ? (
                        <SamplePreviewView preview={preview} />
                      ) : (
                        <div className="border-t border-v2-border/60 px-3 py-2 text-[11px] text-v2-muted">
                          No sample available.
                        </div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Action bar */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        }
        right={
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={noneSelected || submitting}
            variant="brand"
          >
            {submitting ? 'Connecting…' : `Connect ${def?.name ?? 'source'} →`}
          </Button>
        }
      />
    </>
  )
}

function SamplePreviewView({ preview }: { preview: SamplePreview }) {
  if (preview.kind === 'objects') {
    return (
      <div className="border-t border-v2-border/60 px-3 py-2.5">
        <ul className="flex flex-col gap-1 font-mono text-[10.5px] text-v2-muted">
          {preview.items.map((it) => (
            <li key={it.name} className="flex items-center justify-between gap-3">
              <span className="truncate text-v2-foreground">{it.name}</span>
              <span>
                {it.size} · {it.modified}
              </span>
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="border-t border-v2-border/60 px-3 py-2 overflow-x-auto">
      <table className="w-full font-mono text-[10.5px]">
        <thead>
          <tr className="border-b border-v2-border/40">
            {preview.columns.map((col, ci) => (
              <th
                key={col}
                scope="col"
                className={cn(
                  'py-1.5 pr-3 text-left font-medium uppercase tracking-[0.08em] text-v2-muted/70',
                  ci < preview.columns.length - 1 && 'border-r border-v2-border/30',
                )}
              >
                <span className="pl-1 pr-2">{col}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {preview.rows.map((r, i) => (
            <tr
              key={typeof r.id === 'string' ? r.id + i : i}
              className="border-b border-v2-border/20 last:border-b-0"
            >
              {preview.columns.map((col, ci) => (
                <td
                  key={col}
                  className={cn(
                    'py-1.5 pr-3 text-v2-foreground/90',
                    ci < preview.columns.length - 1 && 'border-r border-v2-border/30',
                  )}
                >
                  <span className="pl-1 pr-2">{r[col] ?? ''}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatRows(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`
  return String(n)
}
