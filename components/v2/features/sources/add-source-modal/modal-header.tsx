'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'

// Step label shown in the mono eyebrow
const STEP_LABELS: Record<string, string> = {
  idle: 'Choose',
  auth: 'Authenticate',
  bridge: 'Authorize',
  trust: 'Connection terms',
  discover: 'Discover',
  confirm: 'Choose datasets',
  done: 'Connected',
}

// Progress 0–1 per step
const STEP_PROGRESS: Record<string, number> = {
  idle: 0,
  auth: 0.20,
  bridge: 0.33,
  trust: 0.50,
  discover: 0.66,
  confirm: 0.83,
  done: 1,
}

// Provider brand colors for the progress hairline
const PROVIDER_COLORS: Record<string, string> = {
  stripe: '#635bff',
  plaid: '#0a85ea',
  quickbooks: '#2ca01c',
  xero: '#13b5ea',
  s3: '#ff9900',
}

type Props = {
  step: string   // 'idle' | 'auth' | 'bridge' | 'trust' | 'discover' | 'confirm' | 'done'
  connectorId: string | null
  accountId?: string
  isDone?: boolean
}

export function ModalHeader({ step, connectorId, accountId, isDone }: Props) {
  const def = connectorId ? connectorById(connectorId) : null
  const progress = STEP_PROGRESS[step] ?? 0
  const label = STEP_LABELS[step] ?? step

  // Provider color for progress bar fill (falls back to v2-green)
  const barColor = connectorId
    ? (PROVIDER_COLORS[connectorId] ?? 'var(--v2-green)')
    : 'var(--v2-foreground)'

  return (
    <div className="shrink-0">
      {/* ── Progress hairline ── */}
      <div
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Setup progress"
        className="h-[1.5px] w-full bg-v2-border/30"
      >
        <div
          className="h-full transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%`, background: barColor }}
        />
      </div>

      {/* ── Header body (only when not idle) ── */}
      {step !== 'idle' && (
        <div className="px-7 pt-7 pb-6">
          {/* Logo + title row */}
          {def && (
            <div className="flex items-center gap-4">
              {/* Logo with optional done check badge */}
              <div className="relative shrink-0">
                {def.logo.kind === 'wordmark' ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex size-12 items-center justify-center rounded-[10px] font-mono text-[12.5px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.06),_0_1px_2px_rgba(0,0,0,0.08)]',
                      WORDMARK_TONES[def.logo.tone],
                    )}
                  >
                    {def.logo.label}
                  </span>
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-[10px] bg-v2-surface-2 ring-1 ring-v2-border/60">
                    <def.logo.Icon className="size-5 text-v2-foreground/80" strokeWidth={1.6} />
                  </span>
                )}
                {/* Green check badge on done step */}
                {isDone && (
                  <span className="absolute -bottom-1 -right-1 flex size-[20px] items-center justify-center rounded-full bg-v2-green text-white ring-2 ring-v2-surface">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                )}
              </div>

              {/* Title */}
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-[24px] font-normal leading-[1.1] tracking-[-0.012em] text-v2-foreground">
                  {isDone ? `${def.name} is connected.` : def.name}
                </h2>
                {accountId ? (
                  <div className="mt-1 font-mono text-[11.5px] text-v2-muted">
                    {accountId}
                  </div>
                ) : def.tagline ? (
                  <div className="mt-1 text-[12.5px] text-v2-muted">
                    {def.tagline}
                  </div>
                ) : null}
              </div>

              {/* Quiet step label, right-aligned. Not a counter — just the name of the moment. */}
              {!isDone && (
                <span className="hidden sm:inline-flex shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-v2-muted/55">
                  {label}
                </span>
              )}
            </div>
          )}

          {/* Fallback when no connector */}
          {!def && step !== 'idle' && (
            <h2 className="font-serif text-[24px] font-normal leading-[1.1] tracking-[-0.012em] text-v2-foreground">
              {label}
            </h2>
          )}
        </div>
      )}
    </div>
  )
}
