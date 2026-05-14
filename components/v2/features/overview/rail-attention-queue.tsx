'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ComputedAttentionItem } from './attention'

interface Props {
  attention: { items: ComputedAttentionItem[]; overflow: number }
  nextPublishAt: string
  attestedCount: number
  pendingCount: number
  failedCount: number
  chainCount: number
  onAttentionRowSelect: (nodeId: string) => void
  onHoverDimSet: (nodeIds: string[] | null) => void
}

function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => new Date(targetIso).getTime())
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // Synchronous setState on mount is intentional here: setMounted drives
    // hydration-safe rendering, and setNow prevents a stale initial value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const ms = Math.max(0, new Date(targetIso).getTime() - now)
  const total = Math.floor(ms / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return (
    <span
      className="font-mono tabular-nums text-[22px] leading-none text-v2-foreground"
      suppressHydrationWarning
    >
      {mounted ? (
        <>
          <span>{mm}</span>
          <span className="motion-safe:animate-[v2-colon-pulse_1s_ease-in-out_infinite]">
            :
          </span>
          <span>{ss}</span>
        </>
      ) : (
        '—'
      )}
    </span>
  )
}

const KIND_ACCENT: Record<ComputedAttentionItem['kind'], string> = {
  pipeline_failed: 'bg-v2-danger',
  pipeline_pending: 'bg-v2-warning',
  pipeline_held: 'bg-v2-warning',
  counterparty_request: 'bg-v2-info',
  rule_fire: 'bg-v2-muted/60',
}

export function RailAttentionQueue({
  attention,
  nextPublishAt,
  attestedCount,
  pendingCount,
  failedCount,
  chainCount,
  onAttentionRowSelect,
  onHoverDimSet,
}: Props) {
  const { items, overflow } = attention

  return (
    <div className="flex h-full flex-col p-5">
      {/* Block 1: Next attestation */}
      <section>
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-v2-muted/70">
          Next attestation
        </p>
        <div className="mt-2.5 flex items-baseline gap-2">
          <Countdown targetIso={nextPublishAt} />
        </div>
        <p className="mt-1.5 text-[11px] leading-none text-v2-muted/70">
          publishing to {chainCount} chain{chainCount === 1 ? '' : 's'}
        </p>
      </section>

      <div className="my-4 h-px bg-v2-border/30" />

      {/* Block 2: Stage health */}
      <section>
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-v2-muted/70">
          Stage health
        </p>
        <div className="mt-2.5 flex items-center gap-3 text-[12px] text-v2-foreground/90">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-v2-success" />
            <span className="font-mono tabular-nums">{attestedCount}</span>
            <span className="text-v2-muted">attested</span>
          </span>
          <span
            className="flex cursor-default items-center gap-1.5"
            onMouseEnter={() => {
              const pendingIds = items
                .filter(
                  (i) => i.kind === 'pipeline_pending' || i.kind === 'pipeline_held',
                )
                .map((i) => ('nodeId' in i ? i.nodeId : ''))
                .filter(Boolean)
              onHoverDimSet(pendingIds)
            }}
            onMouseLeave={() => onHoverDimSet(null)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-v2-warning" />
            <span className="font-mono tabular-nums">{pendingCount}</span>
            <span className="text-v2-muted">pending</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-v2-danger" />
            <span className="font-mono tabular-nums">{failedCount}</span>
            <span className="text-v2-muted">failed</span>
          </span>
        </div>
      </section>

      <div className="my-4 h-px bg-v2-border/30" />

      {/* Block 3: Attention queue */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-v2-muted/70">
          Needs your attention
        </p>

        {items.length === 0 ? (
          <p className="mt-3 text-[11px] text-v2-muted/70">Nothing needs attention</p>
        ) : (
          <ul className="mt-2.5 space-y-0.5">
            {items.map((item, idx) => {
              const isPipeline =
                item.kind === 'pipeline_failed' ||
                item.kind === 'pipeline_pending' ||
                item.kind === 'pipeline_held'
              const onEnter = () => {
                if (isPipeline && 'nodeId' in item) {
                  onHoverDimSet([item.nodeId])
                }
              }
              const onLeave = () => onHoverDimSet(null)
              const content = (
                <div
                  className={cn(
                    'group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left',
                    'transition-colors hover:bg-v2-foreground/[0.04]',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                      KIND_ACCENT[item.kind],
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] leading-tight text-v2-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-v2-muted/80">
                      {item.detail}
                    </p>
                  </div>
                </div>
              )
              if (isPipeline && 'nodeId' in item) {
                return (
                  <li key={`${item.kind}-${idx}`}>
                    <button
                      type="button"
                      className="w-full"
                      onClick={() => onAttentionRowSelect(item.nodeId)}
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeave}
                    >
                      {content}
                    </button>
                  </li>
                )
              }
              return (
                <li key={`${item.kind}-${idx}`}>
                  <Link
                    href={item.href}
                    className="block"
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                  >
                    {content}
                  </Link>
                </li>
              )
            })}
            {overflow > 0 && (
              <li>
                <Link
                  href="/v2/alerts"
                  className="block px-2 py-1.5 text-[11px] text-v2-muted hover:text-v2-foreground"
                >
                  +{overflow} more
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
