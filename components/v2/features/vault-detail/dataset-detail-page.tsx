'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  ChevronDown,
  Clock,
  Code2,
  Download,
  Globe,
  Plus,
  Trash2,
  Upload,
  Webhook,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtRelative } from '@/components/v2/features/origination/format'
import { getPaletteFamily } from '@/components/v2/lib/palette'
import { AuraCard } from '@/components/v2/ui/aura-card'
import { Surface } from '@/components/v2/ui/surface'
import { StatusPill, type StatusTone } from '@/components/v2/ui/status-pill'
import { PRIVACY_TONE, PrivacyBar, countByPrivacy } from './privacy'
import { AccessPanel } from './access-panel'
import { LineagePanel } from './lineage-panel'
import type { Vault } from '@/components/v2/features/origination/origination-fixture'
import type {
  AscClass,
  AnalysisRule,
  CounterpartyGrant,
  Dataset,
  DatasetField,
  DatasetStatus,
  FieldType,
  PrivacyLevel,
  SyncMethod,
  SyncStatus,
  ValidationStatus,
} from './data-fixture'
import { datasetAccess, datasetConfigs } from './data-fixture'

// ── Constants ───────────────────────────────────────────────────────────────

const STATUS_TONE: Record<DatasetStatus, StatusTone> = {
  live: 'success',
  syncing: 'warning',
  failed: 'danger',
}
const STATUS_LABEL: Record<DatasetStatus, string> = {
  live: 'Live',
  syncing: 'Syncing',
  failed: 'Failed',
}
const TYPE_LABEL: Record<FieldType, string> = {
  string: 'string',
  number: 'num',
  currency: 'currency',
  percent: 'pct',
  date: 'date',
  enum: 'enum',
  address: 'addr',
  bool: 'bool',
  hash: 'hash',
}
const ASC_DESCRIPTION: Record<AscClass, string> = {
  L1: 'Quoted prices, active markets',
  L2: 'Observable inputs',
  L3: 'Unobservable, internal models',
}
const PRIVACY_ORDER: PrivacyLevel[] = ['private', 'join', 'aggregate', 'dimension', 'select']

const ANALYSIS_RULE_LABEL: Record<AnalysisRule, string> = {
  aggregation: 'Aggregation rule — only aggregate queries permitted on this dataset.',
  list: 'List rule — only intersection queries returning entity match lists.',
  custom: 'Custom rule — only pre-approved query templates may run.',
}

// ── Tab routing ─────────────────────────────────────────────────────────────

const TAB_KEYS = ['overview', 'schema', 'config', 'access', 'explorer', 'lineage'] as const
type TabKey = (typeof TAB_KEYS)[number]

function isTabKey(v: string | null): v is TabKey {
  return TAB_KEYS.includes(v as TabKey)
}

function resolveTab(searchParam: string | null): TabKey {
  return isTabKey(searchParam) ? searchParam : 'overview'
}

function fmtCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`
  return new Intl.NumberFormat('en-US').format(n)
}

// ── PII detection ───────────────────────────────────────────────────────────

interface PIIDetection {
  field: DatasetField
  piiLabel: string
  risk: 'high' | 'medium'
}

const PII_PATTERNS: Array<{ re: RegExp; label: string; risk: 'high' | 'medium' }> = [
  { re: /legal_name|full_name|first_name|last_name|family_name|surname/i, label: 'Legal name', risk: 'high' },
  { re: /(?:^|_)name(?:$|_)/i, label: 'Name', risk: 'high' },
  { re: /(?:^|_)email(?:$|_)/i, label: 'Email', risk: 'high' },
  { re: /(?:^|_)phone(?:$|_)|mobile/i, label: 'Phone', risk: 'high' },
  { re: /ssn|tax_id|tin|ein/i, label: 'Government ID', risk: 'high' },
  { re: /dob|birth/i, label: 'Birthdate', risk: 'high' },
  { re: /(?:^|_)did(?:$|_)|wallet/i, label: 'Decentralized ID', risk: 'high' },
  { re: /address|street|postcode|zip|postal/i, label: 'Address', risk: 'medium' },
  { re: /custodian_account|account_number|account_id/i, label: 'Account number', risk: 'medium' },
  { re: /borrower_(?!did)/i, label: 'Borrower identity', risk: 'medium' },
]

function detectPII(fields: DatasetField[]): Map<string, PIIDetection> {
  const out = new Map<string, PIIDetection>()
  for (const f of fields) {
    for (const p of PII_PATTERNS) {
      if (p.re.test(f.name)) {
        out.set(f.name, { field: f, piiLabel: p.label, risk: p.risk })
        break
      }
    }
  }
  return out
}

// ── Activity fixture ────────────────────────────────────────────────────────

type ActivityKind = 'sync' | 'query' | 'access' | 'source'

interface ActivityEvent {
  id: string
  kind: ActivityKind
  actor: string
  action: string
  at: string
}

const ACTIVITY_FIXTURE: ActivityEvent[] = [
  { id: 'a1', kind: 'query', actor: 'Gauntlet', action: 'ran concentration check', at: '12s ago' },
  { id: 'a2', kind: 'query', actor: 'Morpho', action: 'pulled NAV feed view', at: '7 min ago' },
  { id: 'a3', kind: 'sync', actor: 'Apollo PMS', action: 'synced new tick', at: '11 min ago' },
  { id: 'a4', kind: 'source', actor: 'Apollo PMS', action: 'delivered tick', at: '34 min ago' },
  { id: 'a5', kind: 'access', actor: 'Aave V4', action: 'requested vault access', at: '2 h ago' },
  { id: 'a6', kind: 'query', actor: 'Gauntlet', action: 'ran advance rate', at: '3 h ago' },
  { id: 'a7', kind: 'sync', actor: 'Apollo PMS', action: 'completed monthly ingestion', at: '24 h ago' },
]

const ACTIVITY_TONE: Record<ActivityKind, { dot: string; label: string }> = {
  sync: { dot: 'bg-v2-success', label: 'Sync' },
  query: { dot: 'bg-v2-info', label: 'Query' },
  access: { dot: 'bg-v2-warning', label: 'Access' },
  source: { dot: 'bg-v2-muted/60', label: 'Source' },
}

// ── Main ────────────────────────────────────────────────────────────────────

interface Props {
  vault: Vault
  dataset: Dataset
}

export function DatasetDetailPage({ vault, dataset }: Props) {
  const family = getPaletteFamily(vault.palette)
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = resolveTab(searchParams.get('tab'))

  const [privacyOverrides, setPrivacyOverrides] = useState<Record<string, PrivacyLevel>>({})
  const [isScrolled, setIsScrolled] = useState(false)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(!entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const fields: DatasetField[] = useMemo(
    () =>
      dataset.fields.map((f) =>
        privacyOverrides[f.name] ? { ...f, privacy: privacyOverrides[f.name] } : f,
      ),
    [dataset.fields, privacyOverrides],
  )
  const setPrivacy = (name: string, level: PrivacyLevel) =>
    setPrivacyOverrides((prev) => ({ ...prev, [name]: level }))

  const piiMap = useMemo(() => detectPII(fields), [fields])
  const mix = countByPrivacy(fields, dataset.fieldCount)
  // computable = all fields that can participate in any query (non-private)
  const computablePct = Math.round(
    ((mix.join + mix.aggregate + mix.dimension + mix.select) / Math.max(dataset.fieldCount, 1)) * 100,
  )

  const navigateToTab = useCallback(
    (key: TabKey) => {
      const params = new URLSearchParams(searchParams.toString())
      if (key === 'overview') {
        params.delete('tab')
      } else {
        params.set('tab', key)
      }
      const qs = params.toString()
      router.replace(qs ? `?${qs}` : '?', { scroll: false })
    },
    [router, searchParams],
  )

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'schema', label: 'Schema', count: dataset.fields.length },
    { key: 'config', label: 'Configuration' },
    { key: 'access', label: 'Access & Templates' },
    { key: 'explorer', label: 'Data Explorer' },
    { key: 'lineage', label: 'Lineage' },
  ]

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 pb-20">
        <Breadcrumb vault={vault} dataset={dataset} />
        <div ref={headerRef}>
          <Header dataset={dataset} />
        </div>

        <div className="flex flex-col gap-0">
          <TabNav
            tabs={tabs}
            active={tab}
            onChange={navigateToTab}
            isScrolled={isScrolled}
            dataset={dataset}
          />
          <div
            role="tabpanel"
            id={`dd-panel-${tab}`}
            aria-labelledby={`dd-tab-${tab}`}
            className="pt-6"
          >
            {tab === 'overview' && (
              <OverviewTab
                dataset={dataset}
                computablePct={computablePct}
                mix={mix}
                piiMap={piiMap}
                family={family}
                vaultId={vault.id}
                onMarkPrivate={(name) => setPrivacy(name, 'private')}
              />
            )}
            {tab === 'schema' && (
              <SchemaPanel
                fields={fields}
                total={dataset.fieldCount}
                piiMap={piiMap}
                analysisRule={dataset.analysisRule}
                onChange={setPrivacy}
              />
            )}
            {tab === 'config' && <ConfigTab dataset={dataset} vaultId={vault.id} />}
            {tab === 'access' && (
              <AccessPanel vault={vault} dataset={dataset} />
            )}
            {tab === 'explorer' && <SamplePanel dataset={dataset} fields={fields} piiMap={piiMap} />}
            {tab === 'lineage' && (
              <LineagePanel vault={vault} dataset={dataset} />
            )}
          </div>
        </div>
      </div>
      {/* Scroll fade — sticky to viewport bottom, only visible when content overflows */}
      <div
        className="pointer-events-none sticky bottom-0 h-8 -mt-8 bg-gradient-to-t from-v2-background to-transparent"
        aria-hidden="true"
      />
    </div>
  )
}

// ── Breadcrumb ──────────────────────────────────────────────────────────────

function Breadcrumb({ vault, dataset }: { vault: Vault; dataset: Dataset }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.nav
      initial={prefersReduced ? false : { opacity: 0 }}
      animate={prefersReduced ? false : { opacity: 1 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.3 }}
      className="flex items-center gap-2 text-[12px] text-v2-muted"
      aria-label="Breadcrumb"
    >
      <Link
        href={`/vaults/${vault.id}/data`}
        className="group inline-flex items-center gap-1.5 transition-colors hover:text-v2-foreground"
      >
        <ArrowLeft
          className="h-3 w-3 transition-transform group-hover:-translate-x-0.5"
          strokeWidth={2}
          aria-hidden="true"
        />
        All datasets
      </Link>
      <span className="text-v2-muted/40">/</span>
      <span className="text-v2-muted/80">{vault.symbol}</span>
      <span className="text-v2-muted/40">/</span>
      <span className="text-v2-foreground/90">{dataset.name}</span>
    </motion.nav>
  )
}

// ── Header — compact, single row ────────────────────────────────────────────

function Header({ dataset }: { dataset: Dataset }) {
  const prefersReduced = useReducedMotion()
  return (
    <motion.header
      initial={prefersReduced ? false : { opacity: 0, y: 4 }}
      animate={prefersReduced ? false : { opacity: 1, y: 0 }}
      transition={prefersReduced ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }}
      className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-[40px] font-normal leading-[1] tracking-tight text-v2-foreground">
            {dataset.name}
          </h1>
          <StatusPill tone={STATUS_TONE[dataset.status]}>
            {STATUS_LABEL[dataset.status]}
          </StatusPill>
        </div>
        <p className="mt-3 text-[13px] text-v2-muted">
          {dataset.source}
          {dataset.ascClass && (
            <>
              <span className="mx-1.5 text-v2-muted/40">·</span>
              <span className="text-v2-foreground/80">ASC 820 · {dataset.ascClass}</span>
              <span className="ml-1.5 text-v2-muted/70">{ASC_DESCRIPTION[dataset.ascClass]}</span>
            </>
          )}
          <span className="mx-1.5 text-v2-muted/40">·</span>
          <span suppressHydrationWarning>synced {fmtRelative(dataset.lastSyncedAt)}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SecondaryAction icon={Code2} label="Run query" />
        <SecondaryAction icon={Download} label="Export" />
      </div>
    </motion.header>
  )
}

function SecondaryAction({ icon: Icon, label }: { icon: typeof Code2; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 text-[12px] font-medium text-v2-foreground/90 transition-colors hover:bg-v2-foreground/[0.04] hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
      {label}
    </button>
  )
}

// ── Hero — 3 big editorial numbers ──────────────────────────────────────────

function Hero({
  dataset,
  computablePct,
  consumerCount,
  queries7d,
}: {
  dataset: Dataset
  computablePct: number
  consumerCount: number
  queries7d: number
}) {
  return (
    <section
      className="grid grid-cols-1 gap-y-8 border-y border-v2-border/30 py-8 sm:grid-cols-3 sm:gap-x-12"
      aria-label="Dataset overview"
    >
      <HeroStat
        label="Volume"
        value={fmtCount(dataset.recordCount)}
        unit="rows"
        sub={`${fmtCount(dataset.fieldCount)} fields`}
      />
      <HeroStat
        label="Privacy posture"
        value={`${computablePct}`}
        unit="% computable"
        sub="aggregate-readable to consumers"
      />
      <HeroStat
        label="Access"
        value={String(consumerCount)}
        unit="consumers"
        sub={`${queries7d} queries · last 7 days`}
      />
    </section>
  )
}

function HeroStat({
  label,
  value,
  unit,
  sub,
}: {
  label: string
  value: string
  unit?: string
  sub: string
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">
        {label}
      </p>
      <p className="flex items-baseline gap-1.5 font-mono text-[40px] font-normal leading-[0.95] tracking-tight tabular-nums text-v2-foreground">
        {value}
        {unit && (
          <span className="font-sans text-[14px] font-normal tracking-normal text-v2-muted/80">
            {unit}
          </span>
        )}
      </p>
      <p className="text-[12px] text-v2-muted">{sub}</p>
    </div>
  )
}

// ── Privacy posture — the one prominent section ─────────────────────────────

function PrivacyPosture({
  totalFields,
  mix,
  analysisRule,
  piiMap,
  family,
  onMarkPrivate,
}: {
  totalFields: number
  mix: Record<PrivacyLevel, number>
  analysisRule: import('./data-fixture').AnalysisRule
  piiMap: Map<string, PIIDetection>
  family: [string, string, string]
  onMarkPrivate: (name: string) => void
}) {
  const detected = Array.from(piiMap.values())
  const exposed = detected.filter((d) => d.field.privacy !== 'private')

  return (
    <AuraCard
      variant="muted"
      family={family}
      seed={10}
      radius="2xl"
      className="flex flex-col gap-7 p-6 md:p-8"
    >
      {/* Distribution */}
      <div className="relative flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[14px] font-medium tracking-tight text-v2-foreground">
            Privacy posture
          </h2>
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-v2-foreground/[0.05] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-v2-muted/80">
              {analysisRule}
            </span>
            <span className="font-mono text-[11px] tabular-nums text-v2-muted/70">
              {fmtCount(totalFields)} fields
            </span>
          </div>
        </div>
        <PrivacyBar counts={mix} height="h-2" />
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {(['private', 'join', 'aggregate', 'dimension', 'select'] as const).map((level) => {
            const tone = PRIVACY_TONE[level]
            const count = mix[level]
            const pct = totalFields > 0 ? Math.round((count / totalFields) * 100) : 0
            return (
              <div key={level} className="flex flex-col gap-1">
                <span
                  className={cn(
                    'text-[10.5px] font-medium uppercase tracking-[0.1em]',
                    tone.chipText,
                  )}
                >
                  {tone.short}
                </span>
                <p className="font-mono text-[22px] font-normal leading-none tracking-tight tabular-nums text-v2-foreground">
                  {fmtCount(count)}
                  <span className="ml-1.5 font-sans text-[11.5px] text-v2-muted">{pct}%</span>
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* PII screening */}
      <div className="relative flex flex-col gap-3 border-t border-v2-border/30 pt-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-[13.5px] font-medium tracking-tight text-v2-foreground">
            PII screening
          </h3>
          {detected.length === 0 ? (
            <span className="text-[12px] text-v2-muted">No PII patterns detected</span>
          ) : exposed.length > 0 ? (
            <span className="text-[12px] text-v2-warning/90">
              <span className="font-mono tabular-nums">{exposed.length}</span>{' '}
              {exposed.length === 1 ? 'column exposed' : 'columns exposed'}
            </span>
          ) : (
            <span className="text-[12px] text-v2-muted">
              <span className="font-mono tabular-nums">{detected.length}</span> protected
            </span>
          )}
        </div>

        {detected.length > 0 && (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {detected.map(({ field: f, piiLabel, risk }) => {
              const isExposed = f.privacy !== 'private'
              return (
                <li
                  key={f.name}
                  className={cn(
                    'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5',
                    isExposed
                      ? 'border-v2-warning/15 bg-v2-foreground/[0.015]'
                      : 'border-v2-border/40 bg-v2-foreground/[0.015]',
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12.5px] text-v2-foreground/95">
                      {f.name}
                    </p>
                    <p className="truncate text-[11px] text-v2-muted">
                      {piiLabel}
                      <span className="mx-1 text-v2-muted/40">·</span>
                      <span className={risk === 'high' ? 'text-v2-warning/90' : 'text-v2-muted'}>
                        {risk} risk
                      </span>
                    </p>
                  </div>
                  {isExposed ? (
                    <button
                      type="button"
                      onClick={() => onMarkPrivate(f.name)}
                      className="shrink-0 rounded-md border border-v2-foreground/20 bg-v2-foreground/[0.06] px-2 py-1 text-[10.5px] font-medium text-v2-foreground/90 transition-colors hover:bg-v2-foreground/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
                    >
                      Make private
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] text-v2-muted">
                      Protected
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AuraCard>
  )
}

// ── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  dataset,
  computablePct,
  mix,
  piiMap,
  family,
  vaultId,
  onMarkPrivate,
}: {
  dataset: Dataset
  computablePct: number
  mix: Record<PrivacyLevel, number>
  piiMap: Map<string, PIIDetection>
  family: [string, string, string]
  vaultId: string
  onMarkPrivate: (name: string) => void
}) {
  const grants = datasetAccess[dataset.id]?.grants ?? []
  const consumerCount = grants.length
  const queries7d = grants.reduce((sum, g) => sum + g.runs7d, 0)

  return (
    <div className="flex flex-col gap-10">
      <Hero dataset={dataset} computablePct={computablePct} consumerCount={consumerCount} queries7d={queries7d} />
      <PrivacyPosture
        totalFields={dataset.fieldCount}
        mix={mix}
        analysisRule={dataset.analysisRule}
        piiMap={piiMap}
        family={family}
        onMarkPrivate={onMarkPrivate}
      />
      <SubscribedCounterparties vaultId={vaultId} grants={grants} />
      <section className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[14px] font-medium tracking-tight text-v2-foreground">
            Recent activity
          </h2>
          <Link
            href={`/vaults/${vaultId}/activity?dataset=${dataset.id}`}
            className="inline-flex items-center gap-1 text-[12px] text-v2-muted transition-colors hover:text-v2-foreground"
          >
            View all
            <ArrowUpRight className="h-3 w-3" strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
        <ActivityPanel />
      </section>
    </div>
  )
}

// ── Subscribed counterparties ─────────────────────────────────────────────────

function SubscribedCounterparties({
  vaultId,
  grants,
}: {
  vaultId: string
  grants: CounterpartyGrant[]
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-[14px] font-medium tracking-tight text-v2-foreground">
          Subscribed counterparties
        </h2>
        <p className="text-[12px] text-v2-muted">
          Counterparties currently authorized to query this dataset.
        </p>
      </div>
      <Surface radius="xl" className="divide-y divide-v2-border/30">
        {grants.map((grant) => {
          const slug = grant.counterparty.toLowerCase().replace(/\s+/g, '-')
          return (
            <Link
              key={slug}
              href={`/vaults/${vaultId}/access?counterparty=${slug}`}
              className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 transition-colors hover:bg-v2-foreground/[0.02] sm:grid-cols-[1fr_auto_auto_auto]"
            >
              <p className="text-[13px] font-medium text-v2-foreground">{grant.counterparty}</p>
              <span className="hidden text-right sm:block">
                <span className="font-mono text-[18px] font-normal leading-none tabular-nums text-v2-foreground">
                  {grant.runs7d}
                </span>
                <span className="ml-1 text-[11px] text-v2-muted">queries</span>
              </span>
              <span className="hidden text-right sm:block">
                <span className="font-mono text-[18px] font-normal leading-none tabular-nums text-v2-foreground">
                  {grant.templateIds.length}
                </span>
                <span className="ml-1 text-[11px] text-v2-muted">templates</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-v2-muted/70">
                {grant.lastActivityAt ?? '—'}
              </span>
            </Link>
          )
        })}
      </Surface>
    </section>
  )
}


// ── Config tab ────────────────────────────────────────────────────────────────

function ConfigTab({ dataset, vaultId }: { dataset: Dataset; vaultId: string }) {
  return <ConfigPanel dataset={dataset} vaultId={vaultId} />
}

// ── Sync method meta ─────────────────────────────────────────────────────────

const SYNC_METHOD_META: Record<SyncMethod, { label: string; Icon: LucideIcon }> = {
  scheduled: { label: 'Scheduled', Icon: Clock },
  realtime:  { label: 'Real-time stream', Icon: Zap },
  manual:    { label: 'Manual upload', Icon: Upload },
  api:       { label: 'API push', Icon: Globe },
  webhook:   { label: 'Webhook', Icon: Webhook },
}

const SYNC_STATUS_DOT: Record<SyncStatus, string> = {
  ok:   'bg-v2-success',
  warn: 'bg-v2-warning',
  fail: 'bg-v2-danger',
}

const VALIDATION_TONE: Record<ValidationStatus, StatusTone> = {
  pass: 'success',
  warn: 'warning',
  fail: 'danger',
}

// ── Section heading ──────────────────────────────────────────────────────────

function SectionHeading({ title, caption, id }: { title: string; caption: string; id?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <h2 id={id} className="text-[13px] font-medium tracking-tight text-v2-foreground">{title}</h2>
      <p className="text-[12px] text-v2-muted">{caption}</p>
    </div>
  )
}

// ── ConfigPanel ──────────────────────────────────────────────────────────────

function ConfigPanel({ dataset, vaultId }: { dataset: Dataset; vaultId: string }) {
  const cfg = datasetConfigs[dataset.id]
  const isManual = dataset.source.toLowerCase().includes('manual')
  const [confirming, setConfirming] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const confirmInputRef = useRef<HTMLInputElement>(null)
  const deleteTriggerRef = useRef<HTMLButtonElement>(null)
  const didOpenRef = useRef(false)

  useEffect(() => {
    if (confirming) {
      didOpenRef.current = true
      confirmInputRef.current?.focus()
    } else if (didOpenRef.current) {
      deleteTriggerRef.current?.focus()
    }
  }, [confirming])

  if (!cfg) {
    return (
      <div className="py-8 text-center text-[13px] text-v2-muted">
        No configuration available for this dataset.
      </div>
    )
  }

  const syncMeta = SYNC_METHOD_META[cfg.syncMethod]
  const SyncIcon = syncMeta.Icon

  // Compute relative "next sync" label
  const nextSyncLabel = cfg.nextSyncAt
    ? fmtRelative(cfg.nextSyncAt)
    : '—'

  // Source connector initial letter
  const connectorInitial = dataset.source.charAt(0).toUpperCase()

  return (
    <div className="flex flex-col gap-8">

      {/* ── 1. Source ────────────────────────────────────────────────────── */}
      <section aria-labelledby="cfg-source-heading" className="flex flex-col gap-3">
        <SectionHeading id="cfg-source-heading" title="Source" caption="Where this dataset's data comes from" />
        <Surface radius="xl" className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left: connector identity */}
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-v2-border/60 bg-v2-foreground/[0.04] font-mono text-[14px] font-medium text-v2-foreground/80"
                aria-hidden="true"
              >
                {connectorInitial}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-v2-foreground">
                  {dataset.source}
                </p>
                <p className="truncate font-mono text-[11px] tabular-nums text-v2-muted">
                  {dataset.sourceId}
                </p>
              </div>
            </div>
            {/* Right: link */}
            <div className="flex items-center sm:justify-end">
              <Link
                href={`/vaults/${vaultId}/sources/${dataset.sourceId}`}
                className="inline-flex items-center gap-1.5 text-[12px] text-v2-foreground/70 transition-colors hover:text-v2-foreground"
              >
                Open source
                <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Surface>
      </section>

      {/* ── 2. Sync method & schedule ────────────────────────────────────── */}
      <section aria-labelledby="cfg-sync-heading" className="flex flex-col gap-3">
        <SectionHeading id="cfg-sync-heading" title="Sync" caption="How and when this dataset refreshes" />
        <Surface radius="xl" className="p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Method */}
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                Method
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px] text-v2-foreground">
                <SyncIcon className="h-3.5 w-3.5 text-v2-muted/70" strokeWidth={1.75} aria-hidden="true" />
                {syncMeta.label}
              </span>
            </div>
            {/* Schedule */}
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                Schedule
              </span>
              <span className="font-mono text-[13px] tabular-nums text-v2-foreground">
                {cfg.schedule}
              </span>
            </div>
            {/* Last sync */}
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                Last sync
              </span>
              <span className="inline-flex items-center gap-1.5 text-[13px]">
                <span
                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', SYNC_STATUS_DOT[cfg.lastSyncStatus])}
                  aria-hidden="true"
                />
                <span className="font-mono tabular-nums text-v2-foreground" suppressHydrationWarning>
                  {fmtRelative(cfg.lastSyncAt)}
                </span>
              </span>
            </div>
            {/* Next sync */}
            <div className="flex flex-col gap-1">
              <span className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70">
                Next sync
              </span>
              <span
                className="font-mono text-[13px] tabular-nums text-v2-foreground"
                suppressHydrationWarning
              >
                {nextSyncLabel}
              </span>
            </div>
          </div>

          {/* Sync history sparkline */}
          <div className="mt-4 border-t border-v2-border/30 pt-4">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-v2-muted/70">Last 8 syncs</span>
              <div className="flex items-center gap-1.5" role="list" aria-label="Sync history">
                {cfg.syncHistory.map((status, idx) => (
                  <span
                    key={idx}
                    role="listitem"
                    title={`Sync ${cfg.syncHistory.length - idx} — ${status}`}
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      SYNC_STATUS_DOT[status],
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </Surface>
      </section>

      {/* ── 3. Validation rules ─────────────────────────────────────────── */}
      <section aria-labelledby="cfg-validation-heading" className="flex flex-col gap-3">
        <SectionHeading
          id="cfg-validation-heading"
          title="Validation"
          caption="Automatic checks on each ingestion. Failures pause sync."
        />
        <Surface radius="xl" className="overflow-hidden">
          <ul className="divide-y divide-v2-border/30" aria-label="Validation rules">
            {cfg.validationRules.map((rule) => (
              <li
                key={rule.name}
                className="grid grid-cols-1 items-center gap-2 px-4 py-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <span className="text-[13px] font-medium text-v2-foreground">{rule.name}</span>
                <span className="text-[12px] text-v2-muted">{rule.description}</span>
                <div className="sm:flex sm:justify-end">
                  <StatusPill tone={VALIDATION_TONE[rule.status]} size="xs">
                    {rule.status}
                  </StatusPill>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-v2-border/30 px-4 py-3">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[12px] text-v2-muted transition-colors hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
              Add rule
            </button>
          </div>
        </Surface>
      </section>

      {/* ── 4. Expected freshness ───────────────────────────────────────── */}
      <section aria-labelledby="cfg-freshness-heading" className="flex flex-col gap-3">
        <SectionHeading
          id="cfg-freshness-heading"
          title="Expected freshness"
          caption="If the dataset goes stale beyond this threshold, it flags in the vault overview."
        />
        <Surface radius="xl" className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label
              htmlFor={`freshness-${dataset.id}`}
              className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-v2-muted/70"
            >
              Threshold
            </label>
            <div className="flex flex-wrap gap-1.5" aria-label={`Active threshold: ${cfg.freshnessThreshold}`}>
              {(['1h', '6h', '24h', '7d', 'manual'] as const).map((opt) => (
                <span
                  key={opt}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-[12px] font-medium',
                    opt === cfg.freshnessThreshold
                      ? 'bg-v2-foreground/[0.09] text-v2-foreground'
                      : 'bg-v2-foreground/[0.03] text-v2-muted',
                  )}
                >
                  {opt}
                </span>
              ))}
            </div>
          </div>
        </Surface>
      </section>

      {/* ── 5. Manual upload (conditional) ─────────────────────────────── */}
      {isManual && (
        <section aria-labelledby="cfg-upload-heading" className="flex flex-col gap-3">
          <SectionHeading
            id="cfg-upload-heading"
            title="Manual upload"
            caption="Drop a file here to start a new ingestion."
          />
          <Surface radius="xl" className="overflow-hidden p-4">
            {/* Drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Drop CSV or XLSX file, or click to browse"
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false) }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.preventDefault() }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors',
                isDragOver
                  ? 'border-v2-foreground/40 bg-v2-foreground/[0.04]'
                  : 'border-v2-border/50 bg-v2-foreground/[0.01] hover:border-v2-border/80 hover:bg-v2-foreground/[0.025]',
              )}
            >
              <Upload
                className="h-5 w-5 text-v2-muted/60"
                strokeWidth={1.5}
                aria-hidden="true"
              />
              <p className="text-[13px] font-medium text-v2-foreground/80">
                Drop CSV or XLSX here, or click to browse
              </p>
              <p className="text-[11px] text-v2-muted">
                Schema must match v4 · max 50 MB
              </p>
            </div>

            {/* Last upload */}
            <div className="mt-3 flex items-center gap-2 text-[12px] text-v2-muted">
              <span>Last upload</span>
              <span className="text-v2-muted/40">·</span>
              <span
                className="font-mono tabular-nums text-v2-foreground/70"
                suppressHydrationWarning
              >
                {fmtRelative(dataset.lastSyncedAt)}
              </span>
            </div>
          </Surface>
        </section>
      )}

      {/* ── 6. Notifications ────────────────────────────────────────────── */}
      <section aria-labelledby="cfg-notifications-heading" className="flex flex-col gap-3">
        <SectionHeading
          id="cfg-notifications-heading"
          title="Notifications"
          caption="Where alerts go when something breaks"
        />
        <Surface radius="xl" className="divide-y divide-v2-border/30 overflow-hidden">
          {/* Email row */}
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Bell
              className="h-3.5 w-3.5 shrink-0 text-v2-muted/60"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="w-14 text-[12px] font-medium text-v2-foreground">Email</span>
            <div className="flex flex-wrap gap-1.5">
              {cfg.notifications.email.map((addr) => (
                <span
                  key={addr}
                  className="rounded-md border border-v2-border/50 bg-v2-foreground/[0.03] px-2 py-0.5 font-mono text-[11px] text-v2-foreground/80"
                >
                  {addr}
                </span>
              ))}
            </div>
          </div>
          {/* Webhook row (only if present) */}
          {cfg.notifications.webhook && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Globe
                className="h-3.5 w-3.5 shrink-0 text-v2-muted/60"
                strokeWidth={1.75}
                aria-hidden="true"
              />
              <span className="w-14 text-[12px] font-medium text-v2-foreground">Webhook</span>
              <span
                className="max-w-xs truncate rounded-md border border-v2-border/50 bg-v2-foreground/[0.03] px-2 py-0.5 font-mono text-[11px] text-v2-muted"
                title={cfg.notifications.webhook}
              >
                {cfg.notifications.webhook}
              </span>
            </div>
          )}
        </Surface>
      </section>

      {/* ── 7. Danger zone ──────────────────────────────────────────────── */}
      <section aria-labelledby="cfg-danger-heading" className="flex flex-col gap-3">
        <SectionHeading id="cfg-danger-heading" title="Danger zone" caption="Irreversible actions for this dataset" />
        <Surface radius="xl" className="flex flex-col gap-3 border-v2-danger/30 p-5">
          <div className="flex items-start gap-3">
            <Trash2
              className="mt-0.5 h-4 w-4 shrink-0 text-v2-danger"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-v2-foreground">Delete this dataset</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-v2-muted">
                Counterparties lose access immediately. Ingestion stops. This cannot be undone.
              </p>
            </div>
            {!confirming && (
              <button
                ref={deleteTriggerRef}
                type="button"
                onClick={() => setConfirming(true)}
                className="shrink-0 rounded-md border border-v2-danger/30 bg-v2-danger/[0.06] px-2.5 py-1.5 text-[12px] font-medium text-v2-danger transition-colors hover:bg-v2-danger/[0.12] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
              >
                Delete dataset
              </button>
            )}
          </div>
          {confirming && (
            <div className="flex flex-col gap-2 border-t border-v2-border/30 pt-3">
              <p className="text-[11.5px] text-v2-warning">
                Type{' '}
                <span className="font-mono text-v2-foreground/90">{dataset.name}</span> to confirm.
              </p>
              <div className="flex gap-2">
                <input
                  ref={confirmInputRef}
                  type="text"
                  aria-label={`Type ${dataset.name} to confirm deletion`}
                  placeholder={dataset.name}
                  className="h-8 flex-1 rounded-md border border-v2-border/60 bg-v2-surface px-2 text-[12px] text-v2-foreground placeholder:text-v2-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
                />
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="rounded-md border border-v2-border/60 bg-v2-surface px-2.5 py-1.5 text-[12px] font-medium text-v2-foreground/90 transition-colors hover:bg-v2-foreground/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-md bg-v2-danger/[0.14] px-2.5 py-1.5 text-[12px] font-medium text-v2-danger transition-colors hover:bg-v2-danger/[0.22]"
                >
                  Confirm delete
                </button>
              </div>
            </div>
          )}
        </Surface>
      </section>
    </div>
  )
}

// ── Tab nav ─────────────────────────────────────────────────────────────────

function TabNav({
  tabs,
  active,
  onChange,
  isScrolled,
  dataset,
}: {
  tabs: Array<{ key: TabKey; label: string; count?: number }>
  active: TabKey
  onChange: (k: TabKey) => void
  isScrolled: boolean
  dataset: Dataset
}) {
  const listRef = useRef<HTMLDivElement>(null)
  const prefersReduced = useReducedMotion()

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = tabs.findIndex((t) => t.key === active)
      const buttons = listRef.current?.querySelectorAll('[role="tab"]')
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        const nextIdx = (currentIndex + 1) % tabs.length
        onChange(tabs[nextIdx].key)
        ;(buttons?.[nextIdx] as HTMLElement | undefined)?.focus()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        const prevIdx = (currentIndex - 1 + tabs.length) % tabs.length
        onChange(tabs[prevIdx].key)
        ;(buttons?.[prevIdx] as HTMLElement | undefined)?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        onChange(tabs[0].key)
        ;(buttons?.[0] as HTMLElement | undefined)?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        const lastIdx = tabs.length - 1
        onChange(tabs[lastIdx].key)
        ;(buttons?.[lastIdx] as HTMLElement | undefined)?.focus()
      }
    },
    [active, tabs, onChange],
  )

  return (
    <div
      className={cn(
        'sticky top-0 z-20 transition-[background-color,border-color] duration-200',
        isScrolled
          ? 'border-b border-v2-border/40 bg-v2-background/90 backdrop-blur-sm'
          : 'bg-transparent',
      )}
    >
      {/* Compact sticky header — only visible once scrolled past the big Header */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isScrolled ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0',
        )}
        aria-hidden={!isScrolled}
      >
        <div className="flex items-center justify-between gap-4 px-0 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-[14px] font-medium tracking-tight text-v2-foreground">
              {dataset.name}
            </span>
            <StatusPill tone={STATUS_TONE[dataset.status]} size="xs">
              {STATUS_LABEL[dataset.status]}
            </StatusPill>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SecondaryAction icon={Code2} label="Run query" />
            <SecondaryAction icon={Download} label="Export" />
          </div>
        </div>
      </div>

      {/* Tab list with horizontal scroll */}
      <div
        className={cn(
          'overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          // bottom border lives here so it spans full width regardless of scroll
          isScrolled ? '' : 'border-b border-v2-border/40',
        )}
      >
        <div
          ref={listRef}
          className="flex items-center gap-px"
          role="tablist"
          onKeyDown={handleKeyDown}
        >
          {tabs.map((t) => {
            const isActive = active === t.key
            return (
              <button
                key={t.key}
                id={`dd-tab-${t.key}`}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={`dd-panel-${t.key}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => onChange(t.key)}
                className={cn(
                  'relative -mb-px inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2.5 text-[13px] font-medium tracking-tight transition-colors',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground',
                  isActive ? 'text-v2-foreground' : 'text-v2-muted hover:text-v2-foreground',
                )}
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 font-mono text-[10px] tabular-nums',
                      isActive
                        ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                        : 'bg-v2-foreground/[0.04] text-v2-muted',
                    )}
                  >
                    {t.count}
                  </span>
                )}
                {isActive && (
                  <motion.span
                    layoutId="dd-tab-underline"
                    className="absolute inset-x-0 -bottom-px h-[2px] bg-v2-foreground"
                    transition={prefersReduced ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Schema panel ────────────────────────────────────────────────────────────

type SchemaFilter = 'all' | 'pii'

function SchemaPanel({
  fields,
  total,
  piiMap,
  analysisRule,
  onChange,
}: {
  fields: DatasetField[]
  total: number
  piiMap: Map<string, PIIDetection>
  analysisRule: AnalysisRule
  onChange: (name: string, level: PrivacyLevel) => void
}) {
  const [filter, setFilter] = useState<SchemaFilter>('all')
  const filtered = useMemo(
    () => (filter === 'pii' ? fields.filter((f) => piiMap.has(f.name)) : fields),
    [filter, fields, piiMap],
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Analysis rule caption */}
      <p className="text-[11.5px] text-v2-muted/80">
        <span className="font-medium text-v2-foreground/70 uppercase tracking-[0.08em] text-[10px]">
          {analysisRule}
        </span>
        {' '}—{' '}
        {ANALYSIS_RULE_LABEL[analysisRule]}
      </p>
      <div className="flex items-center justify-between">
        <p className="text-[12.5px] text-v2-muted">
          Showing <span className="font-mono tabular-nums text-v2-foreground/90">{filtered.length}</span>{' '}
          of <span className="font-mono tabular-nums text-v2-foreground/90">{fmtCount(total)}</span>{' '}
          fields. Click a tier to change.
        </p>
        <div className="inline-flex rounded-md border border-v2-border/50 bg-v2-surface p-[2px]">
          {(['all', 'pii'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'rounded-[4px] px-2 py-0.5 text-[11px] font-medium tracking-tight transition-colors',
                filter === f
                  ? 'bg-v2-foreground/[0.08] text-v2-foreground'
                  : 'text-v2-muted hover:bg-v2-foreground/[0.04] hover:text-v2-foreground',
              )}
            >
              {f === 'all' ? 'All fields' : 'PII only'}
            </button>
          ))}
        </div>
      </div>
      <Surface radius="xl" className="overflow-hidden">
        <ul className="divide-y divide-v2-border/30">
          {filtered.map((f) => {
            const pii = piiMap.get(f.name)
            return (
              <li
                key={f.name}
                className="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 sm:grid-cols-[1fr_72px_auto]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-mono text-[13px] text-v2-foreground">{f.name}</p>
                    {pii && (
                      <span
                        className="inline-flex items-center gap-1 rounded-md bg-v2-warning/[0.12] px-1.5 py-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-v2-warning"
                        title={`${pii.piiLabel} — ${pii.risk} risk`}
                      >
                        <AlertTriangle className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden="true" />
                        PII · {pii.piiLabel}
                      </span>
                    )}
                  </div>
                  {f.description && (
                    <p className="mt-0.5 truncate text-[11.5px] text-v2-muted/80">{f.description}</p>
                  )}
                </div>
                <span className="hidden rounded-md bg-v2-foreground/[0.05] px-1.5 py-0.5 text-center font-mono text-[10px] text-v2-muted sm:inline-block">
                  {TYPE_LABEL[f.type]}
                </span>
                <TierSelect value={f.privacy} onChange={(l) => onChange(f.name, l)} fieldName={f.name} />
              </li>
            )
          })}
        </ul>
      </Surface>
    </div>
  )
}

function TierSelect({
  value,
  onChange,
  fieldName,
}: {
  value: PrivacyLevel
  onChange: (level: PrivacyLevel) => void
  fieldName: string
}) {
  const tone = PRIVACY_TONE[value]
  const Icon = tone.Icon
  return (
    <div className="relative">
      <span
        className={cn(
          'pointer-events-none flex items-center gap-1.5 rounded-md px-2 pr-7 py-1 text-[10.5px] font-medium uppercase tracking-[0.08em]',
          tone.chipBg,
          tone.chipText,
        )}
      >
        <Icon className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden="true" />
        {tone.short}
      </span>
      <ChevronDown
        className={cn(
          'pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2',
          tone.chipText,
        )}
        strokeWidth={2}
        aria-hidden="true"
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PrivacyLevel)}
        aria-label={`Privacy tier for ${fieldName}`}
        className="absolute inset-0 cursor-pointer opacity-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
      >
        {PRIVACY_ORDER.map((level) => (
          <option key={level} value={level}>
            {PRIVACY_TONE[level].label}
          </option>
        ))}
      </select>
    </div>
  )
}

// ── Sample panel ────────────────────────────────────────────────────────────

const SAMPLE_ROWS = 8

function SamplePanel({
  dataset,
  fields,
  piiMap,
}: {
  dataset: Dataset
  fields: DatasetField[]
  piiMap: Map<string, PIIDetection>
}) {
  // Prefer showing fields that have renderable values (select/dimension first),
  // ensuring the preview isn't 100% masked. Fall back to first 6.
  const previewFields = useMemo(() => {
    const renderable = fields.filter((f) => f.privacy === 'select' || f.privacy === 'dimension')
    const rest = fields.filter((f) => f.privacy !== 'select' && f.privacy !== 'dimension')
    return [...renderable, ...rest].slice(0, 6)
  }, [fields])
  const rows = useMemo(() => {
    const out: Array<{ index: number; values: Record<string, string> }> = []
    for (let i = 0; i < SAMPLE_ROWS; i++) {
      const values: Record<string, string> = {}
      for (const f of previewFields) values[f.name] = synthValue(dataset.id, f, i)
      out.push({ index: i, values })
    }
    return out
  }, [dataset.id, previewFields])

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] text-v2-muted">
        Showing <span className="font-mono tabular-nums text-v2-foreground/90">{SAMPLE_ROWS}</span>{' '}
        of <span className="font-mono tabular-nums text-v2-foreground/90">{fmtCount(dataset.recordCount)}</span>{' '}
        rows.{' '}
        <Link href="#" className="text-v2-foreground/90 underline decoration-v2-foreground/40 underline-offset-2 hover:decoration-v2-foreground">
          Run a query
        </Link>{' '}
        for more.
      </p>
      <Surface radius="xl" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-v2-border/40">
                {previewFields.map((f) => {
                  const tone = PRIVACY_TONE[f.privacy]
                  const Icon = tone.Icon
                  const isPII = piiMap.has(f.name)
                  const isNumeric = ['currency', 'percent', 'number'].includes(f.type)
                  return (
                    <th
                      key={f.name}
                      scope="col"
                      className={cn(
                        'whitespace-nowrap px-4 py-3 align-bottom',
                        isNumeric ? 'text-right' : 'text-left',
                      )}
                    >
                      <div className={cn('flex flex-col gap-1', isNumeric && 'items-end')}>
                        <span className="flex items-center gap-1.5 font-mono text-[12px] text-v2-foreground">
                          {f.name}
                          {isPII && (
                            <AlertTriangle
                              className="h-3 w-3 text-v2-warning"
                              strokeWidth={2}
                              aria-label="contains PII"
                            />
                          )}
                        </span>
                        <span
                          className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.08em]',
                            tone.chipText,
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden="true" />
                          {tone.short}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.index}
                  className="border-b border-v2-border/25 transition-colors last:border-b-0 hover:bg-v2-foreground/[0.02]"
                >
                  {previewFields.map((f) => {
                    const isNumeric = ['currency', 'percent', 'number'].includes(f.type)
                    return (
                      <td
                        key={f.name}
                        className={cn(
                          'whitespace-nowrap px-4 py-2.5',
                          isNumeric ? 'text-right' : 'text-left',
                        )}
                      >
                        <CellValue field={f} value={r.values[f.name]} />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Surface>
    </div>
  )
}

function CellValue({ field, value }: { field: DatasetField; value: string }) {
  // Clean-room masking: only select and dimension fields return raw values.
  if (field.privacy === 'private') {
    return (
      <span
        className="font-mono text-[11.5px] text-v2-muted/50"
        title="Private — never accessible"
      >
        [private]
      </span>
    )
  }
  if (field.privacy === 'aggregate') {
    return (
      <span
        className="font-mono text-[11.5px] text-v2-muted/50"
        title="Aggregate-only — raw values are never returned"
      >
        —
      </span>
    )
  }
  if (field.privacy === 'join') {
    // Show a hashed/truncated form to illustrate the join-key concept.
    const isHashLike = field.type === 'hash' || field.type === 'address' || /did/i.test(field.name)
    if (isHashLike) {
      return (
        <span className="font-mono text-[11.5px] text-v2-muted/70" title="Join key — raw value is never returned in results">
          {value}
        </span>
      )
    }
    // For non-hash join keys, show a truncated hash hint
    return (
      <span className="font-mono text-[11.5px] text-v2-muted/70" title="Join key — raw value is never returned in results">
        0x…{value.slice(-4)}
      </span>
    )
  }

  // select and dimension: render raw value using type-appropriate styling
  switch (field.type) {
    case 'currency':
    case 'percent':
    case 'number':
      return (
        <span className="font-mono text-[12.5px] tabular-nums text-v2-foreground/95">{value}</span>
      )
    case 'date':
      return <span className="font-mono text-[12px] tabular-nums text-v2-muted">{value}</span>
    case 'hash':
    case 'address':
      return <span className="font-mono text-[11.5px] text-v2-muted">{value}</span>
    case 'bool': {
      const truthy = value === 'true'
      return (
        <span className="inline-flex items-center gap-1.5 text-[12.5px]">
          <span
            className={cn(
              'h-1.5 w-1.5 shrink-0 rounded-full',
              truthy ? 'bg-v2-success' : 'bg-v2-muted/40',
            )}
            aria-hidden="true"
          />
          <span className={truthy ? 'text-v2-foreground/90' : 'text-v2-muted'}>{value}</span>
        </span>
      )
    }
    case 'enum':
      return (
        <span className="inline-flex items-center rounded-md bg-v2-foreground/[0.06] px-1.5 py-0.5 text-[11px] font-medium tracking-tight text-v2-foreground/90">
          {value}
        </span>
      )
    case 'string':
    default:
      return <span className="text-[12.5px] text-v2-foreground/95">{value}</span>
  }
}

// ── Activity panel ──────────────────────────────────────────────────────────

function ActivityPanel() {
  return (
    <div role="list" aria-label="Recent activity">
      {ACTIVITY_FIXTURE.map((e) => {
        const tone = ACTIVITY_TONE[e.kind]
        return (
          <div
            key={e.id}
            role="listitem"
            tabIndex={0}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-v2-foreground/[0.025] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
          >
            <span className="w-16 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-v2-muted/60">
              {tone.label}
            </span>
            <p className="min-w-0 flex-1 truncate text-[13px] text-v2-foreground/90">
              <span className="font-medium text-v2-foreground">{e.actor}</span>{' '}
              <span className="text-v2-muted">{e.action}</span>
            </p>
            <span className="shrink-0 font-mono text-[11.5px] tabular-nums text-v2-muted/60">
              {e.at}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Preview row synthesis ───────────────────────────────────────────────────

const ENUM_SAMPLES: Record<string, string[]> = {
  asc_class: ['L1', 'L2', 'L3'],
  industry_sector: [
    'Tech',
    'Healthcare',
    'Energy',
    'Financials',
    'Industrials',
    'Consumer',
    'Utilities',
  ],
  asset_class: ['Loan', 'Bond', 'Equity', 'ABS'],
  venue: ['NYSE', 'NASDAQ', 'OTC', 'BLP'],
  covenant_status: ['Pass', 'Watch', 'Breach'],
  risk_grade: ['A', 'BBB', 'BB', 'B', 'CCC'],
  lien_position: ['First-lien', 'Second-lien', 'Unsecured'],
  reporting_period: ['Q1 2026', 'Q4 2025', 'Q3 2025', 'Q2 2025'],
}

function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function synthValue(datasetId: string, field: DatasetField, rowIdx: number): string {
  const seed = hash(`${datasetId}-${field.name}-${rowIdx}`)
  switch (field.type) {
    case 'currency': {
      const v = 50_000 + (seed % 9_500_000)
      return `$${v.toLocaleString('en-US')}`
    }
    case 'percent': {
      const v = (seed % 2200) / 100
      return `${v.toFixed(2)}%`
    }
    case 'number': {
      const v = seed % 1_000_000
      return v.toLocaleString('en-US')
    }
    case 'date': {
      const dayOffset = seed % 730
      const d = new Date(Date.now() - dayOffset * 86_400_000)
      return d.toISOString().slice(0, 10)
    }
    case 'bool':
      return seed % 2 === 0 ? 'true' : 'false'
    case 'hash':
      return `0x${(seed.toString(16) + '0000000000').slice(0, 8)}…${(seed * 31).toString(16).slice(0, 4)}`
    case 'address':
      return `0x${(seed.toString(16) + '00000000').slice(0, 8)}…${(seed * 7).toString(16).slice(0, 4)}`
    case 'enum': {
      const pool = ENUM_SAMPLES[field.name] ?? ['A', 'B', 'C']
      return pool[seed % pool.length]
    }
    case 'string':
    default: {
      if (/id$/i.test(field.name)) {
        return `${field.name.toUpperCase().slice(0, 3)}-${(seed % 100000).toString().padStart(5, '0')}`
      }
      if (/did/i.test(field.name)) {
        return `did:hyve:${seed.toString(16).slice(0, 10)}`
      }
      if (/name/i.test(field.name)) {
        const samples = [
          'Atlas Co.',
          'Northwind',
          'Helios Cap',
          'Arc Logistics',
          'Riverbend',
          'Sable Holdings',
          'Beacon Mfg',
          'Cipher Labs',
        ]
        return samples[seed % samples.length]
      }
      return `${seed.toString(36).slice(0, 8)}`
    }
  }
}
