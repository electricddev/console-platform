'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { CardAura } from './card-aura'
import type { ComponentProps } from 'react'

type AuraVariant = ComponentProps<typeof CardAura>['variant']

interface KpiStripProps {
  totalNav: string
  navPerShare: string
  sharesOutstanding: string
  /** ISO timestamp of next scheduled publish. */
  nextPublishAt: string
  asOfLabel: string
}

interface KpiTileProps {
  label: string
  value: string
  hint?: string
  /** Render the value with monospaced numerals for the live counter. */
  mono?: boolean
  auraVariant?: AuraVariant
  auraId: string
  blobX?: number
  blobY?: number
}

function KpiTile({ label, value, hint, mono, auraVariant, auraId, blobX, blobY }: KpiTileProps) {
  return (
    <div className="relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-v2-border/50 bg-v2-surface p-5 transition-all duration-300 hover:border-v2-border hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/30">
      <CardAura variant={auraVariant} id={auraId} blobX={blobX} blobY={blobY} />
      <p className="relative z-10 text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-v2-muted/70">
        {label}
      </p>
      <p
        className={cn(
          'relative z-10 whitespace-nowrap text-[26px] font-medium leading-none tracking-tight text-v2-foreground',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </p>
      {hint && (
        <p
          className="relative z-10 text-[11px] leading-none text-v2-muted/80 tabular-nums"
          suppressHydrationWarning
        >
          {hint}
        </p>
      )}
    </div>
  )
}

/** Returns the remaining time as { hh, mm, ss } strings, clamped at 0. */
function remaining(targetIso: string, now: number) {
  const ms = Math.max(0, new Date(targetIso).getTime() - now)
  const total = Math.floor(ms / 1000)
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return {
    hh: String(hh).padStart(2, '0'),
    mm: String(mm).padStart(2, '0'),
    ss: String(ss).padStart(2, '0'),
    total,
  }
}

function NextPublishTile({ nextPublishAt }: { nextPublishAt: string }) {
  // SSR-safe: compute initial value from the target timestamp without using
  // Date.now() until the client mounts. This prevents a hydration mismatch
  // and a "flash of stale countdown" on first paint.
  const [now, setNow] = useState(() => new Date(nextPublishAt).getTime())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)

    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])

  const { hh, mm, ss, total } = remaining(nextPublishAt, now)
  // Hide hours when zero to avoid noise (most cadences <1h).
  const value = mounted
    ? hh === '00'
      ? `${mm}:${ss}`
      : `${hh}:${mm}:${ss}`
    : '—'

  return (
    <div className="relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-v2-border/50 bg-v2-surface p-5 transition-all duration-300 hover:border-v2-border hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-black/30">
      <CardAura variant="amber" id="kpi-next-publish" blobX={60} blobY={90} />
      <p className="relative z-10 flex items-center gap-2 text-[10px] font-medium uppercase leading-none tracking-[0.16em] text-v2-muted/70">
        Next publish
        <Pulse running={mounted && total > 0} />
      </p>
      <p
        className={cn(
          'relative z-10 whitespace-nowrap text-[26px] font-medium leading-none tracking-tight text-v2-foreground',
          'font-mono tabular-nums'
        )}
      >
        {value}
      </p>
      <p className="relative z-10 text-[11px] leading-none text-v2-muted/80 tabular-nums">
        {mounted && total === 0 ? 'publishing now…' : 'until next attestation'}
      </p>
    </div>
  )
}

/** Tiny pulsing dot — signals "live" without using a colored accent. */
function Pulse({ running }: { running: boolean }) {
  return (
    <span className="relative inline-flex h-1.5 w-1.5">
      {running && (
        <span className="absolute inset-0 animate-ping rounded-full bg-v2-foreground/50" />
      )}
      <span
        className={cn(
          'relative inline-flex h-1.5 w-1.5 rounded-full',
          running ? 'bg-v2-foreground' : 'bg-v2-muted/40'
        )}
      />
    </span>
  )
}

export function KpiStrip({
  totalNav,
  navPerShare,
  sharesOutstanding,
  nextPublishAt,
  asOfLabel,
}: KpiStripProps) {
  return (
    <section
      aria-label="Fund key metrics"
      className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4"
    >
      <KpiTile
        label="Total NAV"
        value={totalNav}
        hint={asOfLabel}
        auraVariant="warm"
        auraId="kpi-total-nav"
        blobX={40}
        blobY={85}
      />
      <KpiTile
        label="NAV per share"
        value={navPerShare}
        hint={asOfLabel}
        mono
        auraVariant="cool"
        auraId="kpi-nav-per-share"
        blobX={55}
        blobY={80}
      />
      <KpiTile
        label="Shares outstanding"
        value={sharesOutstanding}
        hint={asOfLabel}
        mono
        auraVariant="neutral"
        auraId="kpi-shares"
        blobX={50}
        blobY={88}
      />
      <NextPublishTile nextPublishAt={nextPublishAt} />
    </section>
  )
}
