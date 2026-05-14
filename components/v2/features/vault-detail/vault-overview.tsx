'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CircleAlert,
  CheckCircle2,
  ChevronRight,
  KeyRound,
  Plug,
  Code2,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaletteEntry } from '@/components/v2/lib/palette'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { fmtRelative } from '@/components/v2/features/origination/format'
import type {
  Vault,
  VaultStatus,
} from '@/components/v2/features/origination/origination-fixture'

const STATUS_LABEL: Record<VaultStatus, string> = {
  live: 'Live',
  syncing: 'Syncing',
  review: 'In review',
  paused: 'Paused',
}

const STATUS_DOT: Record<VaultStatus, string> = {
  live: 'bg-v2-success',
  syncing: 'bg-v2-info',
  review: 'bg-v2-warning',
  paused: 'bg-v2-muted/60',
}

interface SourcePreview {
  name: string
  detail: string
  status: 'sealed' | 'syncing' | 'review' | 'paused'
  lastAt: string
}

interface ActivityPreview {
  id: string
  actor: string
  action: string
  at: string
  kind: 'data' | 'query' | 'access'
}

interface ConsumerPreview {
  id: string
  name: string
  scope: string
  cap: string
  status: 'active' | 'pending'
  accent: string
}

interface Props {
  vault: Vault
}

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()

const SOURCES: SourcePreview[] = [
  { name: 'Apollo PMS', detail: 'Position management · daily', status: 'sealed', lastAt: minsAgo(83) },
  { name: 'BNY Mellon SWIFT', detail: 'Custodian holdings · 13:00 UTC', status: 'sealed', lastAt: minsAgo(11) },
  { name: 'Bloomberg BPIPE', detail: 'Loan pricing · 15-min', status: 'syncing', lastAt: minsAgo(7) },
  { name: 'ALPS API', detail: 'Fund admin NAV', status: 'review', lastAt: hoursAgo(3) },
]

const ACTIVITY: ActivityPreview[] = [
  { id: 'a1', actor: 'Gauntlet', action: 'ran concentration check', at: '12s ago', kind: 'query' },
  { id: 'a2', actor: 'BNY Mellon', action: 'sealed holdings snapshot', at: '8 min ago', kind: 'data' },
  { id: 'a3', actor: 'Morpho', action: 'pulled NAV feed view', at: '34 min ago', kind: 'query' },
  { id: 'a4', actor: 'Aave V4', action: 'requested data vault access', at: '2 h ago', kind: 'access' },
  { id: 'a5', actor: 'mark.t@securitize.io', action: 'sealed April loan tape', at: '24 h ago', kind: 'data' },
]

const SOURCE_STATUS_DOT: Record<SourcePreview['status'], string> = {
  sealed: 'bg-v2-success',
  syncing: 'bg-v2-info',
  review: 'bg-v2-warning',
  paused: 'bg-v2-muted/60',
}

const ACTIVITY_KIND_LABEL: Record<ActivityPreview['kind'], string> = {
  data: 'Data',
  query: 'Query',
  access: 'Access',
}

export function VaultOverview({ vault }: Props) {
  const palette = getPaletteEntry(vault.palette)
  const hex = palette?.hex ?? '#888'
  const hexEnd = palette?.hexEnd ?? hex

  const consumers: ConsumerPreview[] = [
    {
      id: 'gauntlet',
      name: 'Gauntlet',
      scope: 'execute · concentration, advance rate',
      cap: '200 / day',
      status: 'active',
      accent: '#5FA3C7',
    },
    {
      id: 'morpho',
      name: 'Morpho',
      scope: 'read · NAV feed',
      cap: 'unlimited',
      status: 'active',
      accent: '#3F7D5F',
    },
    {
      id: 'aave',
      name: 'Aave V4',
      scope: 'pending review',
      cap: '—',
      status: 'pending',
      accent: '#D9A24A',
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 py-4">
      {/* Hero */}
      <motion.header
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col gap-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: hex }}
              />
              <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-v2-foreground">
                {vault.symbol}
              </h1>
            </div>
            <p className="mt-1.5 text-[14px] text-v2-muted">{vault.name}</p>
            <p className="text-[13px] text-v2-muted/70">Sponsor · {vault.sponsor}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="relative inline-flex h-1.5 w-1.5">
              {vault.status === 'syncing' && (
                <span className="absolute inset-0 inline-flex animate-ping rounded-full bg-v2-info/60 motion-reduce:hidden" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-1.5 w-1.5 rounded-full',
                  STATUS_DOT[vault.status]
                )}
              />
            </span>
            <span className="text-[13px] text-v2-muted" suppressHydrationWarning>
              {STATUS_LABEL[vault.status]} · sealed {fmtRelative(vault.lastSealAt)}
            </span>
          </div>
        </div>

        {/* Stat row — muted AuraCard tiles */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCell label="NAV" value={vault.nav} accent={hex} accentEnd={hexEnd} position="br" />
          <StatCell label="Sources" value={String(vault.streams)} accent={hex} accentEnd={hexEnd} position="tr" />
          <StatCell label="Consumers" value={String(vault.consumers)} accent={hex} accentEnd={hexEnd} position="bl" />
          <StatCell label="Queries approved" value="14" accent={hex} accentEnd={hexEnd} position="tl" />
        </div>
      </motion.header>

      {/* Two-col: Sources + Recent activity. Both list containers are muted AuraCards. */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-7">
          <SectionTitle
            title="Sources"
            href={`/v2/vaults/${vault.id}/sources`}
            icon={Plug}
          />
          <AuraCard variant="muted" accent={hex} accentEnd={hexEnd} position="tr" className="divide-y divide-v2-border/40">
            {SOURCES.map((s) => (
              <Link
                key={s.name}
                href={`/v2/vaults/${vault.id}/sources`}
                className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
              >
                <span
                  aria-hidden="true"
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SOURCE_STATUS_DOT[s.status])}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-v2-foreground">
                    {s.name}
                  </p>
                  <p className="truncate text-[12px] text-v2-muted">{s.detail}</p>
                </div>
                <span
                  className="shrink-0 text-[12px] tabular-nums text-v2-muted/70"
                  suppressHydrationWarning
                >
                  {fmtRelative(s.lastAt)}
                </span>
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 text-v2-muted/40 transition-all group-hover:translate-x-0.5 group-hover:text-v2-muted"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
              </Link>
            ))}
          </AuraCard>
        </section>

        <section className="flex flex-col gap-4 lg:col-span-5">
          <SectionTitle
            title="Recent activity"
            href={`/v2/vaults/${vault.id}/activity`}
            icon={History}
          />
          <AuraCard variant="muted" accent={hex} accentEnd={hexEnd} position="bl" className="divide-y divide-v2-border/40">
            {ACTIVITY.map((a) => (
              <Link
                key={a.id}
                href={`/v2/vaults/${vault.id}/activity`}
                className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
              >
                <ActivityKindIcon kind={a.kind} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-v2-foreground">
                    <span className="font-medium">{a.actor}</span>{' '}
                    <span className="text-v2-muted">{a.action}</span>
                  </p>
                </div>
                <span className="shrink-0 text-[11.5px] tabular-nums text-v2-muted/70">
                  {a.at}
                </span>
              </Link>
            ))}
          </AuraCard>
        </section>
      </div>

      {/* Consumers — muted AuraCards, each tinted by its counterparty palette */}
      <section className="flex flex-col gap-4">
        <SectionTitle
          title="Access"
          href={`/v2/vaults/${vault.id}/access`}
          icon={KeyRound}
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {consumers.map((c) => (
            <AuraCard
              key={c.id}
              variant="muted"
              accent={c.accent}
              as={Link}
              href={`/v2/vaults/${vault.id}/access`}
              interactive
              className="flex h-32 flex-col gap-3 p-4"
            >
              <div className="relative flex items-center justify-between">
                <p className="text-[14px] font-medium tracking-tight text-v2-foreground">
                  {c.name}
                </p>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px]',
                    c.status === 'active' ? 'text-v2-success' : 'text-v2-warning'
                  )}
                >
                  {c.status === 'active' ? (
                    <CheckCircle2 className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <CircleAlert className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
                  )}
                  {c.status}
                </span>
              </div>
              <p className="relative text-[12px] leading-snug text-v2-muted">{c.scope}</p>
              <p className="relative mt-auto text-[11.5px] tabular-nums text-v2-muted/70">
                {c.cap}
              </p>
            </AuraCard>
          ))}
        </div>
      </section>

      {/* Queries CTA — muted, wider */}
      <section>
        <AuraCard
          variant="muted"
          accent={hex}
          accentEnd={hexEnd}
          position="tr"
          as={Link}
          href={`/v2/vaults/${vault.id}/queries`}
          interactive
          className="group flex items-center gap-4 p-5"
        >
          <Code2
            className="relative h-5 w-5 shrink-0 text-v2-muted"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <div className="relative min-w-0 flex-1">
            <p className="text-[14px] font-medium text-v2-foreground">
              Approved queries
            </p>
            <p className="mt-0.5 text-[12.5px] text-v2-muted">
              NAV computation, concentration check, advance rate, non-accrual flag — plus 10 custom queries.
            </p>
          </div>
          <ArrowRight
            className="relative h-4 w-4 shrink-0 text-v2-muted transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </AuraCard>
      </section>
    </div>
  )
}

function StatCell({
  label,
  value,
  accent,
  accentEnd,
  position,
}: {
  label: string
  value: string
  accent: string
  accentEnd?: string
  position: 'tl' | 'tr' | 'bl' | 'br'
}) {
  return (
    <AuraCard variant="muted" accent={accent} accentEnd={accentEnd} position={position} className="flex flex-col gap-2 p-4">
      <p className="relative text-[11px] uppercase tracking-[0.12em] text-v2-muted/80">
        {label}
      </p>
      <p className="relative text-[22px] font-semibold leading-none tracking-tight tabular-nums text-v2-foreground">
        {value}
      </p>
    </AuraCard>
  )
}

function SectionTitle({
  title,
  href,
  icon: Icon,
}: {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number; 'aria-hidden'?: boolean }>
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-v2-muted" strokeWidth={1.75} aria-hidden />
        <h2 className="text-[15px] font-medium tracking-tight text-v2-foreground">
          {title}
        </h2>
      </div>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-[12.5px] text-v2-muted transition-colors hover:text-v2-foreground"
      >
        View all
        <ArrowRight
          className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
      </Link>
    </div>
  )
}

function ActivityKindIcon({ kind }: { kind: ActivityPreview['kind'] }) {
  const tone =
    kind === 'data'
      ? 'bg-v2-foreground/10 text-v2-foreground/90'
      : kind === 'query'
        ? 'bg-v2-foreground/10 text-v2-foreground/90'
        : 'bg-v2-warning/15 text-v2-warning'
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[10px] font-medium uppercase tracking-[0.08em]',
        tone
      )}
    >
      {ACTIVITY_KIND_LABEL[kind]}
    </span>
  )
}
