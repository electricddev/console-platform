'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { fixtures } from '@/lib/api/fixtures'
import { v2Palette } from '@/components/v2/lib/palette'

const ASSET_CLASS_TO_PALETTE: Record<string, string> = {
  'trade-receivables': 'forest',
  'private-credit': 'periwinkle',
  't-bills': 'sky',
  'flow-credit': 'amber',
  'rwa-equities': 'mauve',
  'real-estate': 'rose',
  'carbon-credits': 'teal',
}

function paletteFor(assetClass: string) {
  const id = ASSET_CLASS_TO_PALETTE[assetClass] ?? 'forest'
  return v2Palette.find((p) => p.id === id) ?? v2Palette[0]
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

function fmtCount(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return String(n)
}

export default function V2DatasetsPage() {
  const datasets = fixtures.datasets

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
          {'// datasets'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">All datasets</h1>
        <p className="mt-1 text-sm text-v2-muted">
          Attested, schema-versioned data rooms across {datasets.length} originators.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {datasets.map((ds, i) => {
          const p = paletteFor(ds.assetClass)
          return (
            <motion.div
              key={ds.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
            >
              <Link
                href={`/v2/datasets/${ds.id}`}
                className="group relative block overflow-hidden rounded-xl border border-v2-border/40 bg-v2-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-v2-border/60 hover:shadow-lg hover:shadow-black/[0.05] dark:hover:shadow-black/30"
              >
                <div
                  className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full opacity-50 blur-3xl transition-opacity duration-300 group-hover:opacity-80"
                  style={{ background: `radial-gradient(circle, ${p.hex}55 0%, transparent 70%)` }}
                />
                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: `linear-gradient(135deg, ${p.hex}, ${p.hexEnd})` }}
                      />
                      <p className="truncate text-[14px] font-semibold tracking-tight text-v2-foreground">
                        {ds.name}
                      </p>
                    </div>
                    <p className="mt-1 truncate text-[12px] text-v2-muted">{ds.description ?? p.label}</p>
                  </div>
                  <span
                    className={
                      'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ' +
                      (ds.status === 'active'
                        ? 'bg-v2-success/15 text-v2-success'
                        : ds.status === 'paused'
                          ? 'bg-v2-warning/15 text-v2-warning'
                          : 'bg-v2-surface-2 text-v2-muted')
                    }
                  >
                    {ds.status}
                  </span>
                </div>
                <dl className="relative z-10 mt-4 grid grid-cols-3 gap-2 text-[11px]">
                  <Stat label="Records" value={fmtCount(ds.recordCount)} />
                  <Stat label="Complete" value={pct(ds.completenessPct)} />
                  <Stat label="Templates" value={String(ds.templateCount)} />
                </dl>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-v2-muted/70">{label}</dt>
      <dd className="mt-0.5 font-medium tabular-nums text-v2-foreground">{value}</dd>
    </div>
  )
}
