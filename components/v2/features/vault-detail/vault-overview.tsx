'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, Code2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getPaletteFamily } from '@/components/v2/lib/palette'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { Surface } from '@/components/v2/ui/surface'
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

const STATUS_TONE: Record<VaultStatus, StatusTone> = {
  live: 'success',
  syncing: 'info',
  review: 'warning',
  paused: 'neutral',
}

interface SourcePreview {
  name: string
  detail: string
  status: 'live' | 'syncing' | 'review' | 'paused'
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
}

interface Props {
  vault: Vault
}

const NOW = Date.now()
const minsAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString()

const SOURCES: SourcePreview[] = [
  { name: 'Apollo PMS', detail: 'Position management · daily', status: 'live', lastAt: minsAgo(83) },
  { name: 'BNY Mellon SWIFT', detail: 'Custodian holdings · 13:00 UTC', status: 'live', lastAt: minsAgo(11) },
  { name: 'Bloomberg BPIPE', detail: 'Loan pricing · 15-min', status: 'syncing', lastAt: minsAgo(7) },
  { name: 'ALPS API', detail: 'Fund admin NAV', status: 'review', lastAt: hoursAgo(3) },
]

const ACTIVITY: ActivityPreview[] = [
  { id: 'a1', actor: 'Gauntlet', action: 'ran concentration check', at: '12s ago', kind: 'query' },
  { id: 'a2', actor: 'BNY Mellon', action: 'completed holdings ingestion', at: '8 min ago', kind: 'data' },
  { id: 'a3', actor: 'Morpho', action: 'pulled NAV feed view', at: '34 min ago', kind: 'query' },
  { id: 'a4', actor: 'Aave V4', action: 'requested data vault access', at: '2 h ago', kind: 'access' },
  { id: 'a5', actor: 'mark.t@securitize.io', action: 'completed April loan tape ingestion', at: '24 h ago', kind: 'data' },
]

const SOURCE_STATUS_TONE: Record<SourcePreview['status'], StatusTone> = {
  live: 'success',
  syncing: 'info',
  review: 'warning',
  paused: 'neutral',
}

const SOURCE_STATUS_LABEL: Record<SourcePreview['status'], string> = {
  live: 'Live',
  syncing: 'Syncing',
  review: 'Review',
  paused: 'Paused',
}

const ACTIVITY_KIND_LABEL: Record<ActivityPreview['kind'], string> = {
  data: 'Data',
  query: 'Query',
  access: 'Access',
}

export function VaultOverview({ vault }: Props) {
  const family = getPaletteFamily(vault.palette)

  const consumers: ConsumerPreview[] = [
    {
      id: 'gauntlet',
      name: 'Gauntlet',
      scope: 'execute · concentration, advance rate',
      cap: '200 / day',
      status: 'active',
    },
    {
      id: 'morpho',
      name: 'Morpho',
      scope: 'read · NAV feed',
      cap: 'unlimited',
      status: 'active',
    },
    {
      id: 'aave',
      name: 'Aave V4',
      scope: 'pending review',
      cap: '—',
      status: 'pending',
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
            <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-v2-foreground">
              {vault.symbol}
            </h1>
            <p className="mt-1.5 text-[14px] text-v2-muted">{vault.name}</p>
            <p className="text-[13px] text-v2-muted/70">Sponsor · {vault.sponsor}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone={STATUS_TONE[vault.status]}>
              {STATUS_LABEL[vault.status]}
            </StatusPill>
            <span className="text-[12px] text-v2-muted/80" suppressHydrationWarning>
              synced {fmtRelative(vault.lastSealAt)}
            </span>
          </div>
        </div>

        {/* Stat row — solid Surface tiles. Stats are read-only, so they
            stay flat and quiet. Gradients are reserved for clickable cards. */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCell label="NAV" value={vault.nav} />
          <StatCell label="Sources" value={String(vault.streams)} />
          <StatCell label="Consumers" value={String(vault.consumers)} />
          <StatCell label="Queries approved" value="14" />
        </div>
      </motion.header>

      {/* Two-col: Sources + Recent activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <section className="flex flex-col gap-4 lg:col-span-7">
          <SectionTitle title="Sources" href={`/vaults/${vault.id}/sources`} />
          <AuraCard
            variant="muted"
            family={family}
            seed={4}
            className="divide-y divide-v2-border/40"
          >
            {SOURCES.map((s) => (
              <Link
                key={s.name}
                href={`/vaults/${vault.id}/sources`}
                className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-v2-foreground">
                    {s.name}
                  </p>
                  <p className="truncate text-[12px] text-v2-muted">{s.detail}</p>
                </div>
                <StatusPill tone={SOURCE_STATUS_TONE[s.status]} size="xs">
                  {SOURCE_STATUS_LABEL[s.status]}
                </StatusPill>
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
          <SectionTitle title="Recent activity" href={`/vaults/${vault.id}/activity`} />
          <AuraCard
            variant="muted"
            family={family}
            seed={5}
            className="divide-y divide-v2-border/40"
          >
            {ACTIVITY.map((a) => (
              <Link
                key={a.id}
                href={`/vaults/${vault.id}/activity`}
                className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
              >
                <StatusPill tone="neutral" size="xs">
                  {ACTIVITY_KIND_LABEL[a.kind]}
                </StatusPill>
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

      {/* Consumers — each card gets a different seed for variation */}
      <section className="flex flex-col gap-4">
        <SectionTitle title="Access" href={`/vaults/${vault.id}/access`} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {consumers.map((c, i) => (
            <AuraCard
              key={c.id}
              variant="muted"
              family={family}
              seed={6 + i}
              as={Link}
              href={`/vaults/${vault.id}/access`}
              interactive
              className="flex h-32 flex-col gap-3 p-4"
            >
              <div className="relative flex items-center justify-between gap-2">
                <p className="text-[14px] font-medium tracking-tight text-v2-foreground">
                  {c.name}
                </p>
                <StatusPill tone={c.status === 'active' ? 'success' : 'warning'} size="xs">
                  {c.status}
                </StatusPill>
              </div>
              <p className="relative text-[12px] leading-snug text-v2-muted">{c.scope}</p>
              <p className="relative mt-auto text-[11.5px] tabular-nums text-v2-muted/70">
                {c.cap}
              </p>
            </AuraCard>
          ))}
        </div>
      </section>

      {/* Queries CTA */}
      <section>
        <AuraCard
          variant="muted"
          family={family}
          seed={9}
          as={Link}
          href={`/vaults/${vault.id}/queries`}
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

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <Surface radius="xl" className="flex flex-col gap-2 p-4">
      <p className="text-[11px] uppercase tracking-[0.12em] text-v2-muted/80">
        {label}
      </p>
      <p className="text-[22px] font-semibold leading-none tracking-tight tabular-nums text-v2-foreground">
        {value}
      </p>
    </Surface>
  )
}

function SectionTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-medium tracking-tight text-v2-foreground">
        {title}
      </h2>
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
