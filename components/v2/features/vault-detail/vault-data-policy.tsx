'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { PRIVACY_TONE, PrivacyBar } from './privacy'
import { computeVaultPolicy } from './data-fixture'
import type { PrivacyLevel } from './data-fixture'

function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`
  return new Intl.NumberFormat('en-US').format(n)
}

export function VaultDataPolicy() {
  const policy = computeVaultPolicy()

  const tiers: Array<{
    level: PrivacyLevel
    count: number
    examples: string[]
  }> = [
    { level: 'on-chain', count: policy.onChain, examples: policy.examples['on-chain'] },
    { level: 'queryable', count: policy.queryable, examples: policy.examples.queryable },
    { level: 'private', count: policy.private, examples: policy.examples.private },
  ]

  return (
    <motion.div
      key="policy"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 6 }}
      transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col gap-6"
    >
      {/* Header */}
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] uppercase tracking-[0.14em] text-v2-muted/70">
          Default view
        </p>
        <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-v2-foreground">
          Vault data policy
        </h2>
        <p className="max-w-prose text-[13.5px] leading-relaxed text-v2-muted">
          What counterparties can compute against this data vault. Every field is
          classified at ingest into one of three tiers. Pick a dataset on the left
          for its schema-level breakdown.
        </p>
      </header>

      {/* Privacy mix at-a-glance */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <p className="text-[11px] uppercase tracking-[0.12em] text-v2-muted/70">
            Across all datasets
          </p>
          <p className="font-mono text-[11px] tabular-nums text-v2-muted/80">
            {fmtCount(policy.totalFields)} fields total
          </p>
        </div>
        <PrivacyBar
          onChain={policy.onChain}
          queryable={policy.queryable}
          privateCount={policy.private}
          height="h-2"
        />
        <div className="flex items-center justify-between gap-3 text-[11px]">
          {tiers.map((t) => {
            const tone = PRIVACY_TONE[t.level]
            return (
              <div key={t.level} className="flex items-center gap-1.5">
                <span className={cn('h-1.5 w-1.5 rounded-full', tone.dot)} />
                <span className="font-mono tabular-nums text-v2-foreground/80">
                  {fmtCount(t.count)}
                </span>
                <span className="text-v2-muted">{tone.short.toLowerCase()}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tier cards */}
      <div className="flex flex-col gap-3">
        {tiers.map((t, i) => {
          const tone = PRIVACY_TONE[t.level]
          const Icon = tone.Icon
          return (
            <motion.div
              key={t.level}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 + i * 0.04, duration: 0.3 }}
            >
              <AuraCard
                variant="muted"
                accent={tone.accent}
                position="tr"
                className="flex flex-col gap-3 p-4"
              >
                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={cn(
                        'inline-flex h-7 w-7 items-center justify-center rounded-md',
                        tone.chipBg,
                        tone.chipText
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-medium tracking-tight text-v2-foreground">
                        {tone.label}
                      </p>
                      <p className="font-mono text-[11px] tabular-nums text-v2-muted">
                        {fmtCount(t.count)} fields
                      </p>
                    </div>
                  </div>
                </div>
                <p className="relative text-[12.5px] leading-relaxed text-v2-muted">
                  {tone.description}
                </p>
                {t.examples.length > 0 && (
                  <div className="relative flex flex-wrap items-center gap-1.5 pt-1">
                    {t.examples.slice(0, 4).map((ex) => (
                      <span
                        key={ex}
                        className="rounded-md border border-v2-border/60 bg-v2-surface px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground/80"
                      >
                        {ex}
                      </span>
                    ))}
                    {t.examples.length > 4 && (
                      <span className="font-mono text-[10.5px] text-v2-muted/70">
                        +{t.examples.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </AuraCard>
            </motion.div>
          )
        })}
      </div>

      {/* Footnote */}
      <p className="text-[11.5px] leading-relaxed text-v2-muted/70">
        Counterparties never receive raw rows. Queries return computed results;
        private fields stay sealed. On-chain references make every result
        independently verifiable against the canonical chain state.
      </p>
    </motion.div>
  )
}
