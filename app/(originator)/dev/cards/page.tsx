'use client'

import Link from 'next/link'
import { ArrowRight, ChevronRight, Code2, Database, Plug, Plus } from 'lucide-react'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { Surface } from '@/components/v2/ui/surface'
import { v2Palette } from '@/components/v2/lib/palette'

export default function CardShowcasePage() {
  const forestFamily = v2Palette.find((p) => p.id === 'forest')!.family
  const skyFamily = v2Palette.find((p) => p.id === 'sky')!.family
  const amberFamily = v2Palette.find((p) => p.id === 'amber')!.family
  const mauveFamily = v2Palette.find((p) => p.id === 'mauve')!.family

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-16 py-4">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] uppercase tracking-[0.16em] text-v2-muted/70">
          dev · components
        </p>
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-v2-foreground">
          Card designs
        </h1>
        <p className="max-w-prose text-[14px] text-v2-muted">
          Three building blocks compose every card in v2:
          <span className="font-mono text-[13px] text-v2-foreground/90"> Surface</span> for the
          panel,
          <span className="font-mono text-[13px] text-v2-foreground/90"> Aura</span> for the
          in-card multi-blob gradient, and
          <span className="font-mono text-[13px] text-v2-foreground/90"> AuraCard</span> which
          bundles them with two intensity variants —
          <span className="text-v2-foreground"> hero</span> and
          <span className="text-v2-foreground"> muted</span>.
        </p>
        <p className="mt-1 max-w-prose text-[12.5px] text-v2-muted/80">
          Auras are <em>compositions</em>, not random color washes. A vault&apos;s palette family
          (3 harmonious hexes) is the input, so every card across a vault sub-page reads in
          one consistent color family.
        </p>
      </header>

      {/* 1. AuraCard variants */}
      <Block
        eyebrow="01"
        title="AuraCard · hero vs muted"
        description="Same composition, different intensity. Use hero for landing-page tiles; muted for sub-page cards."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AuraCard variant="hero" family={forestFamily} interactive className="flex h-48 flex-col justify-between p-6">
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.12em] text-v2-muted/70">
                variant="hero"
              </p>
              <h3 className="mt-2 text-[24px] font-semibold leading-none tracking-tight text-v2-foreground">
                ACRED
              </h3>
              <p className="mt-2 text-[13px] text-v2-muted">family = forest · teal · light-green</p>
            </div>
            <p className="relative text-[12px] text-v2-muted/80">3-blob composition</p>
          </AuraCard>
          <AuraCard variant="muted" family={forestFamily} interactive className="flex h-48 flex-col justify-between p-6">
            <div className="relative">
              <p className="text-[11px] uppercase tracking-[0.12em] text-v2-muted/70">
                variant="muted"
              </p>
              <h3 className="mt-2 text-[24px] font-semibold leading-none tracking-tight text-v2-foreground">
                Same family, dialed down
              </h3>
              <p className="mt-2 text-[13px] text-v2-muted">For sub-page cards</p>
            </div>
            <p className="relative text-[12px] text-v2-muted/80">Lower opacity stops</p>
          </AuraCard>
        </div>
      </Block>

      {/* 2. Palette families — the vault gallery */}
      <Block
        eyebrow="02"
        title="Palette families"
        description="Each vault picks one. The aura always reads in that family — BUIDL blueish, ACRED greenish, KSTR mauveish, etc."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
          {v2Palette.map((p) => (
            <AuraCard
              key={p.id}
              variant="hero"
              family={p.family}
              className="flex h-32 flex-col justify-between p-4"
            >
              <p className="relative text-[13px] font-medium tracking-tight text-v2-foreground">
                {p.label}
              </p>
              <div className="relative flex flex-wrap gap-1">
                {p.family.map((c) => (
                  <span
                    key={c}
                    className="font-mono text-[9.5px] tabular-nums text-v2-muted"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </AuraCard>
          ))}
        </div>
      </Block>

      {/* 3. Single-color shortcut */}
      <Block
        eyebrow="03"
        title="Single-color shortcut (accent)"
        description="Pass accent={hex} when you want one color — used for tier cards (on-chain, queryable, private) where the color encodes meaning, not a vault identity."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <AuraCard variant="muted" accent="#3F7D5F" className="flex h-32 flex-col justify-between p-4">
            <p className="relative text-[13px] font-medium text-v2-foreground">On-chain tier</p>
            <p className="relative font-mono text-[10.5px] tabular-nums text-v2-muted">#3F7D5F</p>
          </AuraCard>
          <AuraCard variant="muted" accent="#5FA3C7" className="flex h-32 flex-col justify-between p-4">
            <p className="relative text-[13px] font-medium text-v2-foreground">Queryable tier</p>
            <p className="relative font-mono text-[10.5px] tabular-nums text-v2-muted">#5FA3C7</p>
          </AuraCard>
          <AuraCard variant="muted" accent="#71706C" className="flex h-32 flex-col justify-between p-4">
            <p className="relative text-[13px] font-medium text-v2-foreground">Private tier</p>
            <p className="relative font-mono text-[10.5px] tabular-nums text-v2-muted">#71706C</p>
          </AuraCard>
        </div>
      </Block>

      {/* 4. Stat tiles */}
      <Block
        eyebrow="04"
        title="Stat tiles"
        description="Compact AuraCards used for vault KPIs. All four read in the same family — feels coherent, not noisy."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="NAV" value="$1.25B" family={skyFamily} />
          <StatTile label="Sources" value="8" family={skyFamily} />
          <StatTile label="Consumers" value="9" family={skyFamily} />
          <StatTile label="Queries" value="14" family={skyFamily} />
        </div>
      </Block>

      {/* 5. List container */}
      <Block
        eyebrow="05"
        title="List container"
        description="AuraCard muted wrapping divider rows. Each row links/hovers independently."
      >
        <AuraCard variant="muted" family={skyFamily} className="divide-y divide-v2-border/40">
          {[
            { name: 'Apollo PMS', detail: 'Position management · daily', time: '1 h ago' },
            { name: 'BNY Mellon SWIFT', detail: 'Custodian holdings · 13:00 UTC', time: '11 min ago' },
            { name: 'Bloomberg BPIPE', detail: 'Loan pricing · 15-min', time: '7 min ago' },
          ].map((s) => (
            <Link
              key={s.name}
              href="/dev/cards"
              className="group relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-v2-foreground/[0.025]"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-v2-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-medium text-v2-foreground">{s.name}</p>
                <p className="truncate text-[12px] text-v2-muted">{s.detail}</p>
              </div>
              <span className="shrink-0 text-[12px] tabular-nums text-v2-muted/70">{s.time}</span>
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 text-v2-muted/40 transition-all group-hover:translate-x-0.5 group-hover:text-v2-muted"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </Link>
          ))}
        </AuraCard>
      </Block>

      {/* 6. CTA / banner */}
      <Block
        eyebrow="06"
        title="CTA / banner"
        description="Single-line affordance with icon, copy, chevron. Picks up the vault family."
      >
        <AuraCard
          variant="muted"
          family={amberFamily}
          as={Link}
          href="/dev/cards"
          interactive
          className="group flex items-center gap-4 p-5"
        >
          <Code2 className="relative h-5 w-5 shrink-0 text-v2-muted" strokeWidth={1.75} aria-hidden />
          <div className="relative min-w-0 flex-1">
            <p className="text-[14px] font-medium text-v2-foreground">Approved queries</p>
            <p className="mt-0.5 text-[12.5px] text-v2-muted">
              NAV computation, concentration check, advance rate, non-accrual flag.
            </p>
          </div>
          <ArrowRight
            className="relative h-4 w-4 shrink-0 text-v2-muted transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.75}
            aria-hidden="true"
          />
        </AuraCard>
      </Block>

      {/* 7. Surface — primitive without aura */}
      <Block
        eyebrow="07"
        title="Surface · no aura"
        description="The bare wrapper. Use directly when you want a clean panel without a palette accent."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Surface radius="xl" className="p-5">
            <p className="text-[12px] uppercase tracking-[0.12em] text-v2-muted/70">tone="solid"</p>
            <p className="mt-2 text-[14px] text-v2-foreground">Default. The plain card.</p>
          </Surface>
          <Surface tone="subtle" radius="xl" className="p-5">
            <p className="text-[12px] uppercase tracking-[0.12em] text-v2-muted/70">tone="subtle"</p>
            <p className="mt-2 text-[14px] text-v2-foreground">
              Lower contrast — chips, low-stakes content.
            </p>
          </Surface>
          <Surface as="button" type="button" interactive radius="xl" className="p-5 text-left">
            <p className="text-[12px] uppercase tracking-[0.12em] text-v2-muted/70">interactive</p>
            <p className="mt-2 text-[14px] text-v2-foreground">Hover lift + cursor pointer.</p>
          </Surface>
        </div>
      </Block>

      {/* 8. Buttons */}
      <Block
        eyebrow="08"
        title="Floating buttons"
        description="Surface used as a small action. Solid bg + hover lift — never transparent."
      >
        <div className="flex flex-wrap gap-3">
          <Surface
            as="button"
            type="button"
            interactive
            radius="md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-v2-foreground"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            New data vault
          </Surface>
          <Surface
            as="button"
            type="button"
            interactive
            radius="md"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium text-v2-foreground"
          >
            <Plug className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            Add source
          </Surface>
          <Surface
            as="button"
            type="button"
            interactive
            radius="md"
            className="inline-flex items-center px-3 py-1.5 text-[13px] font-medium text-v2-foreground"
          >
            View all
          </Surface>
        </div>
      </Block>

      {/* 9. Dashed placeholders */}
      <Block
        eyebrow="09"
        title="Empty · placeholder"
        description="Dashed-border Surface for 'add new' affordances inside grids."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Surface
            as="button"
            type="button"
            interactive
            radius="2xl"
            className="flex h-44 flex-col items-center justify-center gap-2 border-dashed text-v2-muted hover:text-v2-foreground"
          >
            <Plus className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-[12px] font-medium">New data vault</span>
          </Surface>
          <Surface
            tone="subtle"
            radius="2xl"
            className="flex h-44 flex-col items-center justify-center gap-2 border-dashed text-v2-muted/60"
          >
            <Database className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-[12px] font-medium">No data yet</span>
          </Surface>
          <Surface
            tone="subtle"
            radius="2xl"
            className="flex h-44 items-center justify-center text-v2-muted/60"
          >
            <span className="text-[12.5px]">Coming soon.</span>
          </Surface>
        </div>
      </Block>

      {/* 10. Pills / chips */}
      <Block
        eyebrow="10"
        title="Pills · chips"
        description="Tiny floating surfaces — for status, role tags, counts."
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-v2-border/60 bg-v2-surface px-2.5 py-1 text-[11px] font-medium text-v2-foreground/80 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-v2-success" />
            Live
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-v2-border/60 bg-v2-surface px-2.5 py-1 text-[11px] font-medium text-v2-foreground/80 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-v2-info" />
            Syncing
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-v2-border/60 bg-v2-surface px-2.5 py-1 text-[11px] font-medium text-v2-foreground/80 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-v2-warning" />
            In review
          </span>
          <span className="inline-flex items-center rounded-md bg-v2-foreground/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-v2-foreground/90">
            Data
          </span>
          <span className="inline-flex items-center rounded-md bg-v2-foreground/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-v2-foreground/90">
            Query
          </span>
          <span className="inline-flex items-center rounded-md bg-v2-warning/15 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-v2-warning">
            Access
          </span>
        </div>
      </Block>
    </div>
  )
}

function Block({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 border-b border-v2-border/40 pb-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-v2-muted/70">
          {eyebrow}
        </p>
        <h2 className="text-[18px] font-semibold tracking-tight text-v2-foreground">{title}</h2>
        <p className="max-w-prose text-[13px] text-v2-muted">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

function StatTile({
  label,
  value,
  family,
}: {
  label: string
  value: string
  family: [string, string, string]
}) {
  return (
    <AuraCard variant="muted" family={family} className="flex flex-col gap-2 p-4">
      <p className="relative text-[11px] uppercase tracking-[0.12em] text-v2-muted/80">{label}</p>
      <p className="relative text-[22px] font-semibold leading-none tracking-tight tabular-nums text-v2-foreground">
        {value}
      </p>
    </AuraCard>
  )
}
