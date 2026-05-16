'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Plus,
  ArrowLeft,
  Award,
  Cable,
  Check,
  Circle,
  Landmark,
  Link2,
  LineChart,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { connectFromCatalog } from '@/app/(app)/legacy/sources/actions'
import type { SourceType } from '@/lib/api/schemas'

type CatalogItem = {
  id: string
  apiType: SourceType | null
  name: string
  tagline: string
  logo: React.ReactNode
  comingSoon?: boolean
}

const CATALOG: CatalogItem[] = [
  {
    id: 'sec',
    apiType: 'sec',
    name: 'SEC EDGAR',
    tagline: 'Regulator',
    logo: <SecMark />,
  },
  {
    id: '9fin',
    apiType: null,
    name: '9fin',
    tagline: 'Credit intelligence',
    logo: <Wordmark label="9fin" tone="ink" />,
    comingSoon: true,
  },
  {
    id: 'securitize-fund-services',
    apiType: null,
    name: 'Securitize Fund Services',
    tagline: 'NAV · fund admin',
    logo: <Wordmark label="SFS" tone="navy" />,
    comingSoon: true,
  },
  {
    id: 'securitize-platform',
    apiType: null,
    name: 'Securitize Platform',
    tagline: 'Transfer agent',
    logo: <Wordmark label="S" tone="teal" />,
    comingSoon: true,
  },
  {
    id: 'redstone',
    apiType: null,
    name: 'RedStone',
    tagline: 'On-chain oracle',
    logo: <Wordmark label="R" tone="red" />,
    comingSoon: true,
  },
  {
    id: 'morpho',
    apiType: null,
    name: 'Morpho',
    tagline: 'DeFi collateral',
    logo: <Wordmark label="M" tone="blue" />,
    comingSoon: true,
  },
  {
    id: 'wormhole',
    apiType: null,
    name: 'Wormhole',
    tagline: 'Cross-chain',
    logo: (
      <TileLogo>
        <Cable className="size-4 text-foreground/70" strokeWidth={1.6} />
      </TileLogo>
    ),
    comingSoon: true,
  },
  {
    id: 'bloomberg',
    apiType: null,
    name: 'Bloomberg / LSEG',
    tagline: 'Market data',
    logo: <Wordmark label="BB" tone="amber" />,
    comingSoon: true,
  },
  {
    id: 'ratings',
    apiType: null,
    name: 'Rating agencies',
    tagline: "Moody's · S&P · Fitch",
    logo: (
      <TileLogo>
        <Award className="size-4 text-foreground/70" strokeWidth={1.6} />
      </TileLogo>
    ),
    comingSoon: true,
  },
  {
    id: 'markit',
    apiType: null,
    name: 'Markit',
    tagline: 'Loan pricing',
    logo: (
      <TileLogo>
        <LineChart className="size-4 text-foreground/70" strokeWidth={1.6} />
      </TileLogo>
    ),
    comingSoon: true,
  },
  {
    id: 'agent-banks',
    apiType: null,
    name: 'Agent banks',
    tagline: 'Alter Domus · Virtus',
    logo: (
      <TileLogo>
        <Landmark className="size-4 text-foreground/70" strokeWidth={1.6} />
      </TileLogo>
    ),
    comingSoon: true,
  },
  {
    id: 'rwa-xyz',
    apiType: null,
    name: 'RWA.xyz · Dune',
    tagline: 'On-chain analytics',
    logo: (
      <TileLogo>
        <Link2 className="size-4 text-foreground/70" strokeWidth={1.6} />
      </TileLogo>
    ),
    comingSoon: true,
  },
]

type SecDataset = {
  id: string
  name: string
  cadence: string
  summary: string
  unit: 'filings' | 'statements'
  rows: number
  coverageStart: string
  lastUpdated: string
}

const SEC_DATASETS: SecDataset[] = [
  {
    id: 'form-n-port',
    name: 'Form N-PORT',
    cadence: 'Monthly · 60d lag',
    summary: 'Position-level holdings, derivatives, DV01/CS01, liquidity buckets, monthly flows.',
    unit: 'filings',
    rows: 284_567,
    coverageStart: 'Aug 2019',
    lastUpdated: '2h ago',
  },
  {
    id: 'form-n-csr',
    name: 'Form N-CSR / N-CSRS',
    cadence: 'Semi-annual',
    summary: 'Audited schedule of investments, statements of assets, financial highlights by class.',
    unit: 'filings',
    rows: 412_108,
    coverageStart: 'May 2003',
    lastUpdated: '6h ago',
  },
  {
    id: 'form-n-cen',
    name: 'Form N-CEN',
    cadence: 'Annual',
    summary: 'Registrant census, share class metadata, service providers, leverage program.',
    unit: 'filings',
    rows: 97_433,
    coverageStart: 'Jun 2018',
    lastUpdated: '1d ago',
  },
  {
    id: 'form-n-2',
    name: 'Form N-2',
    cadence: 'Event-driven',
    summary: 'Master prospectus — fee table, portfolio guidelines, share classes, risk factors.',
    unit: 'filings',
    rows: 8_421,
    coverageStart: 'Jan 2003',
    lastUpdated: '12h ago',
  },
  {
    id: 'form-n-23c3a',
    name: 'Form N-23C3A',
    cadence: 'Quarterly',
    summary: 'Repurchase offer terms, NAV pricing date, shares tendered and accepted.',
    unit: 'filings',
    rows: 5_832,
    coverageStart: 'Jan 2015',
    lastUpdated: '4d ago',
  },
  {
    id: 'form-24f-2',
    name: 'Form 24F-2',
    cadence: 'Annual',
    summary: 'Annual registration fee reconciliation — shares registered, sold, unsold inventory.',
    unit: 'filings',
    rows: 187_260,
    coverageStart: 'Jan 2003',
    lastUpdated: '3d ago',
  },
  {
    id: 'form-497',
    name: 'Form 497',
    cadence: 'Event-driven',
    summary: 'Prospectus supplements — fee changes, class launches and closings, strategy updates.',
    unit: 'filings',
    rows: 1_428_914,
    coverageStart: 'Jan 2003',
    lastUpdated: '1h ago',
  },
  {
    id: 'xbrl-financials',
    name: 'XBRL Financial Statements',
    cadence: 'Continuous',
    summary: 'Machine-readable financial statements tagged across N-CSR and N-PORT filings.',
    unit: 'statements',
    rows: 2_341_067,
    coverageStart: 'Jul 2009',
    lastUpdated: '1h ago',
  },
]

function fmtCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000
    return (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '')) + 'M'
  }
  if (n >= 1_000) return Math.round(n / 1_000) + 'K'
  return String(n)
}

type Step = 'catalog' | 'sec-loading' | 'sec-datasets'

const SEC_LOADING_STEPS: { id: string; label: string; duration: number }[] = [
  { id: 'connect', label: 'Connecting to EDGAR PDS', duration: 650 },
  { id: 'index', label: 'Indexing 12,847 registrants', duration: 700 },
  { id: 'resolve', label: 'Resolving series and class identifiers', duration: 500 },
  { id: 'count', label: 'Counting 4.7M filings across 8 forms', duration: 750 },
  { id: 'load', label: 'Loading dataset definitions', duration: 400 },
]

export function AddDataSourceDialog() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('catalog')
  const [pending, setPending] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setStep('catalog')
      setPending(null)
    }
  }

  function pick(item: CatalogItem) {
    if (item.comingSoon || !item.apiType) return
    if (item.apiType === 'sec') {
      setStep('sec-loading')
      return
    }
    setPending(item.id)
    startTransition(async () => {
      const form = new FormData()
      form.set('type', item.apiType as string)
      form.set('name', item.name)
      try {
        await connectFromCatalog(form)
      } finally {
        setPending(null)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Add data source
        </Button>
      </DialogTrigger>
      <DialogContent className="gap-6 p-6 sm:max-w-xl">
        {step === 'catalog' ? (
          <CatalogView pending={pending} onPick={pick} />
        ) : step === 'sec-loading' ? (
          <SecLoadingView
            onDone={() => setStep('sec-datasets')}
            onBack={() => setStep('catalog')}
          />
        ) : (
          <SecDatasetsView onBack={() => setStep('catalog')} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function CatalogView({
  pending,
  onPick,
}: {
  pending: string | null
  onPick: (item: CatalogItem) => void
}) {
  return (
    <>
      <DialogHeader className="gap-2">
        <DialogTitle className="font-heading text-xl leading-tight">Add data source</DialogTitle>
        <DialogDescription className="text-sm">
          Choose a source to connect to the data layer.
        </DialogDescription>
      </DialogHeader>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CATALOG.map((item) => {
          const isPending = pending === item.id
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                disabled={item.comingSoon || isPending}
                aria-label={item.comingSoon ? `${item.name} — coming soon` : `Open ${item.name}`}
                className={cn(
                  'group flex h-full w-full items-center gap-3 rounded-lg border border-border bg-card px-3.5 py-3 text-left transition-colors',
                  'focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
                  item.comingSoon
                    ? 'cursor-not-allowed opacity-50'
                    : 'hover:border-foreground/30 hover:bg-muted/30'
                )}
              >
                <div className="shrink-0">{item.logo}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium leading-tight">{item.name}</h3>
                    {item.comingSoon ? (
                      <span className="font-tag text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        Soon
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {isPending ? 'Connecting…' : item.tagline}
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function SecLoadingView({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (activeIndex >= SEC_LOADING_STEPS.length) {
      const t = setTimeout(onDone, 350)
      return () => clearTimeout(t)
    }
    const step = SEC_LOADING_STEPS[activeIndex]
    const t = setTimeout(() => setActiveIndex((i) => i + 1), step.duration)
    return () => clearTimeout(t)
  }, [activeIndex, onDone])

  const progress = Math.min(activeIndex / SEC_LOADING_STEPS.length, 1)
  const allDone = activeIndex >= SEC_LOADING_STEPS.length

  return (
    <>
      <DialogHeader className="gap-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Cancel and go back"
        >
          <ArrowLeft className="size-3" />
          Cancel
        </button>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <SecMark />
            <span
              aria-hidden
              className="absolute -inset-1 rounded-md ring-2 ring-foreground/15 motion-safe:animate-ping"
            />
          </div>
          <div>
            <DialogTitle className="font-heading text-xl leading-tight">SEC EDGAR</DialogTitle>
            <DialogDescription className="text-xs">
              Searching for available datasets…
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>

      <ul className="grid gap-2">
        {SEC_LOADING_STEPS.map((step, i) => {
          const isDone = i < activeIndex || allDone
          const isActive = i === activeIndex && !allDone
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-2.5 text-sm transition-colors',
                isDone
                  ? 'text-foreground'
                  : isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground/45'
              )}
            >
              <span className="flex size-4 shrink-0 items-center justify-center">
                {isDone ? (
                  <Check className="size-3.5 text-foreground" strokeWidth={2.5} />
                ) : isActive ? (
                  <Loader2 className="size-3.5 animate-spin text-foreground" />
                ) : (
                  <Circle className="size-2.5 text-muted-foreground/30" strokeWidth={1.5} />
                )}
              </span>
              <span>{step.label}</span>
            </li>
          )
        })}
      </ul>

      <div
        className="h-px w-full overflow-hidden bg-border"
        role="progressbar"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-px bg-foreground transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </>
  )
}

function SecDatasetsView({ onBack }: { onBack: () => void }) {
  const allIds = SEC_DATASETS.map((d) => d.id)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(allIds))
  const [submitting, setSubmitting] = useState(false)
  const [, startTransition] = useTransition()

  const selectedCount = selected.size
  const allSelected = selectedCount === SEC_DATASETS.length
  const noneSelected = selectedCount === 0

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds))
  }

  function ingest() {
    if (noneSelected) return
    setSubmitting(true)
    startTransition(async () => {
      const form = new FormData()
      form.set('type', 'sec')
      form.set('name', 'SEC EDGAR')
      try {
        await connectFromCatalog(form)
      } finally {
        setSubmitting(false)
      }
    })
  }

  return (
    <>
      <DialogHeader className="gap-3">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label="Back to catalog"
        >
          <ArrowLeft className="size-3" />
          Back
        </button>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <SecMark />
            <div>
              <DialogTitle className="font-heading text-xl leading-tight">SEC EDGAR</DialogTitle>
              <DialogDescription className="text-xs">
                Choose datasets to ingest.
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleAll}
            className="mt-1 shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded px-1 py-0.5"
          >
            {allSelected ? 'Clear all' : 'Select all'}
          </button>
        </div>
      </DialogHeader>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SEC_DATASETS.map((d) => {
          const checked = selected.has(d.id)
          return (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => toggle(d.id)}
                aria-pressed={checked}
                className={cn(
                  'group flex h-full w-full flex-col gap-1.5 rounded-lg border p-3.5 text-left transition-colors',
                  'focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none',
                  checked
                    ? 'border-foreground/30 bg-muted/30'
                    : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/20'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium leading-tight">{d.name}</h4>
                  <span
                    aria-hidden
                    className={cn(
                      'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
                      checked
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-input bg-background group-hover:border-foreground/40'
                    )}
                  >
                    {checked ? <Check className="size-3" strokeWidth={2.5} /> : null}
                  </span>
                </div>
                <p className="font-tag text-[10px] uppercase tracking-wider text-muted-foreground">
                  {d.cadence}
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground">{d.summary}</p>
                <dl className="mt-1 grid grid-cols-3 gap-x-2 border-t border-border/60 pt-2 text-[10px] tabular-nums text-muted-foreground">
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-tag uppercase tracking-wider text-muted-foreground/60">
                      Rows
                    </dt>
                    <dd className="font-medium text-foreground/80">{fmtCount(d.rows)}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-tag uppercase tracking-wider text-muted-foreground/60">
                      Since
                    </dt>
                    <dd className="font-medium text-foreground/80">{d.coverageStart}</dd>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <dt className="font-tag uppercase tracking-wider text-muted-foreground/60">
                      Updated
                    </dt>
                    <dd className="font-medium text-foreground/80">{d.lastUpdated}</dd>
                  </div>
                </dl>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{selectedCount}</span> of{' '}
          {SEC_DATASETS.length} selected
        </p>
        <Button onClick={ingest} disabled={noneSelected || submitting} size="sm">
          {submitting
            ? 'Connecting…'
            : noneSelected
              ? 'Select datasets'
              : `Ingest ${selectedCount} dataset${selectedCount === 1 ? '' : 's'}`}
        </Button>
      </div>
    </>
  )
}

function TileLogo({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex size-9 items-center justify-center rounded-md border border-border bg-background">
      {children}
    </div>
  )
}

const WORDMARK_TONES = {
  ink: 'bg-foreground text-background',
  navy: 'bg-[#0b2545] text-white',
  teal: 'bg-[#0f766e] text-white',
  red: 'bg-[#b91c1c] text-white',
  blue: 'bg-[#1d4ed8] text-white',
  amber: 'bg-[#f7a600] text-black',
} as const

function Wordmark({ label, tone }: { label: string; tone: keyof typeof WORDMARK_TONES }) {
  const length = label.length
  const textSize =
    length <= 1 ? 'text-sm' : length <= 2 ? 'text-xs' : length <= 3 ? 'text-[11px]' : 'text-[10px]'
  return (
    <div
      aria-hidden
      className={cn(
        'flex size-9 items-center justify-center rounded-md font-mono font-semibold tracking-tight',
        WORDMARK_TONES[tone],
        textSize
      )}
    >
      {label}
    </div>
  )
}

function SecMark() {
  return (
    <div
      aria-hidden
      className="flex size-9 items-center justify-center rounded-md bg-[#0b2545] text-white"
    >
      <span className="font-mono text-[11px] font-semibold tracking-[0.02em]">SEC</span>
    </div>
  )
}
