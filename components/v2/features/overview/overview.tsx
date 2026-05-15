'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { VaultCard } from '@/components/v2/features/origination/vault-card'
import { fmtRelative } from '@/components/v2/features/origination/format'
import {
  vaults,
  activityFeed,
  attentionItems,
  type AttentionKind,
  type ActivityKind,
} from '@/components/v2/features/origination/origination-fixture'

// ── Greeting derivation ───────────────────────────────────────────────────────

type TimePeriod = 'morning' | 'afternoon' | 'evening'

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  return 'evening'
}

function getGreeting(period: TimePeriod): string {
  if (period === 'morning') return 'Good morning.'
  if (period === 'afternoon') return 'Good afternoon.'
  return 'Good evening.'
}

function getSubLine(period: TimePeriod): string {
  const n = attentionItems.length
  if (n > 0) {
    const plural = n === 1 ? 'item needs' : 'items need'
    return `${n} ${plural} your attention this ${period}.`
  }
  const first = activityFeed[0]
  if (first) {
    return `${first.actor} ${first.action}, ${fmtRelative(first.at)}.`
  }
  return `Everything's quiet across all vaults.`
}

// ── Severity metadata map ─────────────────────────────────────────────────────

const SEVERITY_META: Record<AttentionKind, { label: string; chipClass: string }> = {
  'sync-failure':   { label: 'Failed',   chipClass: 'bg-v2-danger/12 text-v2-danger' },
  'grant-expiring': { label: 'Expiring', chipClass: 'bg-v2-warning/12 text-v2-warning' },
  'schema-drift':   { label: 'Drift',    chipClass: 'bg-v2-warning/12 text-v2-warning' },
  'access-request': { label: 'Pending',  chipClass: 'bg-v2-info/12 text-v2-info' },
}

// ── Activity kind label ───────────────────────────────────────────────────────

const ACTIVITY_KIND_LABEL: Record<ActivityKind, string> = {
  sync: 'SYNC',
  query: 'QUERY',
  access: 'ACCESS',
  source: 'SOURCE',
}

// ── Severity → aura family map ────────────────────────────────────────────────
// Each entry is a [string, string, string] hex trio passed to AuraCard.
// Danger uses a custom red trio approximating --v2-danger; slightly desaturated
// so the blurred glow reads as a calm tint rather than an alarm.
const SEVERITY_AURA: Record<AttentionKind, [string, string, string]> = {
  'sync-failure':   ['#C44A2E', '#D87A5E', '#9E3426'], // red (desaturated from v2-danger)
  'grant-expiring': ['#D9A24A', '#EDC987', '#C77B8A'], // amber (matches v2-warning)
  'schema-drift':   ['#D9A24A', '#EDC987', '#C77B8A'], // amber (matches v2-warning)
  'access-request': ['#5FA3C7', '#4FA6A6', '#8EA4D2'], // sky/blue (matches v2-info)
}

// ── Stagger animation ─────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: 'easeOut' as const },
  }),
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Overview() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 py-6 md:py-8">

      {/* Hero greeting */}
      <motion.header
        custom={0}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col pt-4 pb-2 md:pt-6"
      >
        <h1
          className="font-serif text-[40px] leading-[1.05] tracking-tight text-v2-foreground md:text-[48px]"
          suppressHydrationWarning
        >
          {getGreeting(getTimePeriod(new Date().getHours()))}
        </h1>
        <p
          className="mt-2 text-[15px] leading-relaxed text-v2-muted md:text-[16px]"
          suppressHydrationWarning
        >
          {getSubLine(getTimePeriod(new Date().getHours()))}
        </p>
      </motion.header>

      {/* Needs attention */}
      <motion.section
        custom={1}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-v2-foreground">
            Needs attention
          </h2>
          <span className="rounded-full bg-v2-foreground/[0.07] px-2 py-0.5 text-[11px] font-medium tabular-nums text-v2-muted">
            {attentionItems.length} items
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {attentionItems.map((item, i) => {
            const { label, chipClass } = SEVERITY_META[item.kind]
            const vault = vaults.find((v) => v.id === item.vaultId)
            const family = SEVERITY_AURA[item.kind]
            return (
              <motion.div
                key={item.id}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <AuraCard
                  as={Link}
                  href={item.href}
                  variant="muted"
                  family={family}
                  seed={i + 7}
                  interactive
                  radius="xl"
                  className="group flex items-center gap-4 px-4 py-3"
                >
                  {/* Severity chip */}
                  <span
                    className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-px font-mono text-[10px] font-medium uppercase tracking-[0.08em] ${chipClass}`}
                  >
                    {label}
                  </span>

                  {/* Title + vault context */}
                  <div className="min-w-0 flex-1 truncate">
                    <span className="text-[13.5px] font-medium text-v2-foreground">
                      {item.title}
                    </span>
                    <span className="ml-2 hidden text-[12.5px] text-v2-muted md:inline">
                      · {vault ? `${vault.symbol} · ${vault.sponsor}` : item.context}
                    </span>
                  </div>

                  {/* Timestamp */}
                  <span
                    className="shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/70"
                    suppressHydrationWarning
                  >
                    {fmtRelative(item.at)}
                  </span>

                  {/* Arrow */}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-v2-muted/40 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-v2-muted"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                </AuraCard>
              </motion.div>
            )
          })}
        </div>
      </motion.section>

      {/* Vaults */}
      <motion.section
        custom={2}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        <h2 className="text-[14px] font-medium text-v2-foreground">Vaults</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {vaults.map((vault, i) => (
            <VaultCard key={vault.id} vault={vault} index={i} />
          ))}
        </div>
      </motion.section>

      {/* Recent activity */}
      <motion.section
        custom={3}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[14px] font-medium text-v2-foreground">
            Recent activity
          </h2>
          <Link
            href="/v2/audit"
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
        <div className="flex flex-col" role="list" aria-label="Recent activity">
          {activityFeed.slice(0, 8).map((event) => (
            <Link
              key={event.id}
              href={`/v2/vaults/${event.vaultId}`}
              role="listitem"
              className="group flex items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
            >
              <span className="w-16 shrink-0 font-mono text-[10.5px] font-medium uppercase tracking-[0.1em] text-v2-muted/60">
                {ACTIVITY_KIND_LABEL[event.kind]}
              </span>
              <p className="min-w-0 flex-1 truncate text-[13px] text-v2-foreground">
                <span className="font-medium text-v2-foreground/90">{event.actor}</span>
                <span className="text-v2-muted"> {event.action}</span>
                <span className="font-mono text-[10.5px] uppercase text-v2-muted/60"> · {event.vaultSymbol}</span>
              </p>
              <span
                className="shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/70"
                suppressHydrationWarning
              >
                {fmtRelative(event.at)}
              </span>
            </Link>
          ))}
        </div>
      </motion.section>

    </div>
  )
}
