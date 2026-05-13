'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { v2Palette } from '@/components/v2/lib/palette'
import { AgentBlob, ProjectBlobs } from '@/components/v2/features/agent-blob'
import { fixtures } from '@/lib/api/fixtures'

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

const greetings = ['Good morning', 'Good afternoon', 'Good evening']

export default function V2HomePage() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? greetings[0] : hour < 18 ? greetings[1] : greetings[2]

  const datasets = fixtures.datasets.slice(0, 7)
  const runs = fixtures.runs.slice(0, 7)
  const issuers = [
    { id: 'mf-one', name: 'mF-ONE', desc: 'Trade-receivables originator', assetClasses: ['trade-receivables', 'private-credit'] },
    { id: 'bowery', name: 'Bowery Capital', desc: 'T-bill pool manager', assetClasses: ['t-bills', 'private-credit'] },
    { id: 'flowcredit', name: 'FlowCredit', desc: 'APAC flow-credit syndicate', assetClasses: ['flow-credit', 'private-credit', 'trade-receivables'] },
  ]

  return (
    <div className="space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <h1 className="text-2xl font-semibold tracking-tight text-v2-foreground">{greeting}</h1>
        <p className="mt-1 text-sm text-v2-muted">Your verifiable data room at a glance</p>
      </motion.div>

      {/* Watched datasets — hero cards with gradient blobs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <div className="mb-4">
          <h2 className="text-sm font-medium text-v2-foreground">Datasets</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {datasets.map((ds, i) => {
            const p = paletteFor(ds.assetClass)
            return (
              <motion.div
                key={ds.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <Link
                  href={`/v2/datasets/${ds.id}`}
                  className="group relative block overflow-hidden rounded-2xl border border-v2-border/40 bg-v2-surface transition-all duration-300 hover:-translate-y-1 hover:border-v2-border/60 hover:shadow-xl hover:shadow-black/[0.08] dark:hover:shadow-black/30"
                >
                  <AgentBlob hex={p.hex} hexEnd={p.hexEnd} id={ds.id} />
                  <div className="relative z-10 p-3.5">
                    <p className="text-[13px] font-semibold leading-tight text-v2-foreground">{ds.name}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-v2-muted">{p.label}</p>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Two-column: Activity feed + Issuers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col lg:col-span-7"
        >
          <div className="mb-4">
            <h2 className="text-sm font-medium text-v2-foreground">Recent runs</h2>
          </div>
          <div className="flex flex-1 flex-col justify-between">
            {runs.map((run, i) => {
              const ds = fixtures.datasets.find((d) => d.id === run.datasetId)
              const p = paletteFor(ds?.assetClass ?? 'private-credit')
              return (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + i * 0.04, duration: 0.35 }}
                  className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all duration-150 hover:border-v2-border/60 hover:bg-v2-surface/50"
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: `linear-gradient(135deg, ${p.hex}, ${p.hexEnd})` }}
                  />
                  <span className="w-24 shrink-0 text-[13px] font-medium text-v2-foreground">
                    {run.id.replace('run_', '#')}
                  </span>
                  <span className="flex-1 truncate text-[13px] text-v2-muted">
                    {run.templateId ?? 'ad-hoc query'}
                  </span>
                  <span className="shrink-0 rounded-md bg-v2-surface-2/80 px-2 py-0.5 text-[11px] font-medium text-v2-muted/80">
                    {run.status}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Issuers */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col lg:col-span-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-medium text-v2-foreground">Top issuers</h2>
            <Link href="/v2/issuers" className="text-xs text-v2-muted transition-colors hover:text-v2-foreground">
              View all
            </Link>
          </div>
          <div className="flex flex-1 flex-col justify-between gap-4">
            {issuers.map((iss, i) => {
              const swatches = iss.assetClasses.map((ac) => paletteFor(ac))
              return (
                <Link key={iss.id} href={`/v2/issuers/${iss.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35 + i * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                    className="group relative flex-1 cursor-pointer overflow-hidden rounded-xl border border-v2-border/40 bg-v2-surface transition-all duration-300 hover:-translate-y-0.5 hover:border-v2-border/60 hover:shadow-lg hover:shadow-black/[0.06] dark:hover:shadow-black/25"
                  >
                    <ProjectBlobs swatches={swatches} id={iss.id} />
                    <div className="relative z-10 p-4">
                      <p className="text-[14px] font-semibold tracking-tight text-v2-foreground">{iss.name}</p>
                      <p className="mt-0.5 text-[12px] text-v2-muted">{iss.desc}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {iss.assetClasses.map((ac) => {
                          const p = paletteFor(ac)
                          return (
                            <span
                              key={ac}
                              className="rounded-md bg-white/60 px-1.5 py-0.5 text-[10px] font-medium text-v2-foreground/60 backdrop-blur-sm dark:bg-white/10"
                            >
                              {p.label}
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
