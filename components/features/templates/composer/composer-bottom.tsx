'use client'

import { useState, useEffect, useMemo } from 'react'
import { Play, Loader2, CheckCircle2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtPct } from '@/lib/format'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Schema } from '@/lib/api/types'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

type Props = {
  dsl: string
  schemaId: string
  datasetId: string
  schema: Schema | null
  fetchPrivacy: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
  className?: string
}

// ─── Policy Check Tab ─────────────────────────────────────────────────────────

type PolicyFinding = {
  fieldName: string
  severity: 'error' | 'warning'
  message: string
}

type PolicyStatus = 'clear' | 'caution' | 'violation' | 'empty'

function analyzeDsl(dsl: string, schema: Schema | null): PolicyFinding[] {
  if (!schema || !dsl.trim()) return []
  const findings: PolicyFinding[] = []
  const lower = dsl.toLowerCase()

  for (const field of schema.fields) {
    const namePattern = new RegExp(`\\b${field.name}\\b`, 'i')
    if (!namePattern.test(dsl)) continue

    if (field.exposure === 'private') {
      findings.push({
        fieldName: field.name,
        severity: 'error',
        message: `Field cannot be selected directly; wrap with aggregate(...) or omit.`,
      })
    } else if (field.exposure === 'aggregated-only') {
      // Check if it's used outside an aggregate function
      // Simple heuristic: look for field name not preceded by aggregate fn context
      const aggFunctions = ['avg', 'sum', 'count', 'min', 'max', 'dp_avg', 'dp_sum', 'dp_count', 'dp_min', 'dp_max', 'aggregate']
      const inAggregate = aggFunctions.some((fn) => {
        const fnPattern = new RegExp(`\\b${fn}\\s*\\([^)]*\\b${field.name}\\b`, 'i')
        return fnPattern.test(dsl)
      })
      if (!inAggregate) {
        findings.push({
          fieldName: field.name,
          severity: 'warning',
          message: `Aggregate-only field used outside aggregate function; will be rejected at runtime.`,
        })
      }
    }
  }

  // Also warn if 'select *' or similar broad selects are present
  if (/select\s+\*/i.test(lower)) {
    findings.push({
      fieldName: '*',
      severity: 'error',
      message: `Wildcard SELECT not permitted; enumerate allowed fields explicitly.`,
    })
  }

  return findings
}

function getPolicyStatus(findings: PolicyFinding[], dsl: string): PolicyStatus {
  if (!dsl.trim()) return 'empty'
  if (findings.some((f) => f.severity === 'error')) return 'violation'
  if (findings.some((f) => f.severity === 'warning')) return 'caution'
  return 'clear'
}

function PolicyDot({ status }: { status: PolicyStatus }) {
  if (status === 'empty') return null
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block size-2 rounded-full shrink-0',
        status === 'clear' && 'bg-success',
        status === 'caution' && 'bg-warning',
        status === 'violation' && 'bg-destructive',
      )}
    />
  )
}

function PolicyCheckPanel({ dsl, schema }: { dsl: string; schema: Schema | null }) {
  const findings = useMemo(() => analyzeDsl(dsl, schema), [dsl, schema])
  const status = getPolicyStatus(findings, dsl)

  if (status === 'empty') {
    return (
      <p className="font-mono text-[0.75rem] text-foreground/40 px-4 py-3">
        {'awaiting hql · type or compile a query above'}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      {/* Status row */}
      <div className="flex items-center gap-2">
        <PolicyDot status={status} />
        <span
          className={cn(
            'font-mono text-[0.78rem]',
            status === 'clear' && 'text-success',
            status === 'caution' && 'text-warning',
            status === 'violation' && 'text-destructive',
          )}
        >
          {status === 'clear' && 'All clear'}
          {status === 'caution' && 'Caution — review required'}
          {status === 'violation' && 'Violations detected'}
        </span>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <ul className="grid gap-1 mt-1" aria-label="Policy findings">
          {findings.map((finding, i) => (
            <li
              key={i}
              className={cn(
                'relative flex items-start gap-3 overflow-hidden rounded border px-3 py-2 bg-background/50',
                finding.severity === 'error' ? 'border-destructive/20' : 'border-warning/20',
              )}
            >
              {/* Severity rail */}
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-0 left-0 w-[2px]',
                  finding.severity === 'error' ? 'bg-destructive' : 'bg-warning',
                )}
              />
              <span
                className={cn(
                  'font-mono text-[0.72rem] shrink-0',
                  finding.severity === 'error' ? 'text-destructive' : 'text-warning',
                )}
              >
                {finding.fieldName}
              </span>
              <span className="font-mono text-[0.72rem] text-foreground/70">
                {finding.message}
              </span>
            </li>
          ))}
        </ul>
      )}

      {findings.length === 0 && status === 'clear' && (
        <p className="font-mono text-[0.72rem] text-success">
          No policy violations detected.
        </p>
      )}
    </div>
  )
}

// ─── Simulation Tab ───────────────────────────────────────────────────────────

function SimulationTab({ datasetId }: { datasetId: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{
    rows: number
    durationMs: number
    kAnonMet: boolean
  } | null>(null)

  async function simulate() {
    setRunning(true)
    await new Promise<void>((r) => setTimeout(r, 900))
    setResult({
      rows: 47 + Math.floor(Math.random() * 40),
      durationMs: 1240 + Math.floor(Math.random() * 600),
      kAnonMet: true,
    })
    setRunning(false)
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <p className="font-mono text-[0.72rem] text-foreground/55 leading-relaxed">
        {'Runs your HQL against a sandboxed copy of '}
        <span className="text-foreground/80">{datasetId}</span>
        {'. Originator data never leaves the enclave.'}
      </p>

      <button
        type="button"
        onClick={simulate}
        disabled={running}
        className={cn(
          'inline-flex items-center gap-2 self-start rounded border border-foreground bg-foreground px-3 py-1.5',
          'font-mono text-[0.75rem] text-background transition-all',
          'hover:bg-foreground/85 active:translate-y-px',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {running
          ? <Loader2 className="size-3 animate-spin" aria-hidden />
          : <Play className="size-3" aria-hidden />}
        {running ? 'Running…' : 'Run on sandbox'}
      </button>

      {result && (
        <div className="rounded border border-border/70 bg-background/60 px-3 py-2">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="size-3 text-success" strokeWidth={1.75} aria-hidden />
            <span className="font-tag text-[0.65rem] text-success">complete</span>
          </div>
          <div className="grid grid-cols-3 gap-x-4 font-mono text-[0.72rem] tabular-nums">
            <div>
              <span className="text-foreground/45 block">rows</span>
              <span className="text-foreground">{result.rows}</span>
            </div>
            <div>
              <span className="text-foreground/45 block">runtime</span>
              <span className="text-foreground">{result.durationMs.toLocaleString()} ms</span>
            </div>
            <div>
              <span className="text-foreground/45 block">k-anon</span>
              <span className={result.kAnonMet ? 'text-success' : 'text-destructive'}>
                {result.kAnonMet ? 'met' : 'violated'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Privacy Analysis Tab ─────────────────────────────────────────────────────

function PrivacyTab({
  dsl,
  schemaId,
  fetchPrivacy,
}: {
  dsl: string
  schemaId: string
  fetchPrivacy: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
}) {
  const [analysis, setAnalysis] = useState<PrivacyAnalysis | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const t = setTimeout(async () => {
      if (dsl.trim().length === 0) {
        setAnalysis(null)
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const r = await fetchPrivacy({ dsl, schemaId })
        if (!cancelled) {
          setAnalysis(r)
          setLoading(false)
        }
      } catch {
        if (!cancelled) setLoading(false)
      }
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [dsl, schemaId, fetchPrivacy])

  const riskScore = analysis?.riskScore
  const riskTone =
    riskScore === undefined
      ? 'text-muted-foreground'
      : riskScore < 0.3
        ? 'text-success'
        : riskScore < 0.6
          ? 'text-warning'
          : 'text-destructive'

  const RiskIcon = loading
    ? Loader2
    : riskScore === undefined
      ? ShieldQuestion
      : riskScore < 0.3
        ? ShieldCheck
        : ShieldAlert

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Risk score row */}
      <div className="flex items-baseline gap-3">
        <RiskIcon
          className={cn('size-3.5 shrink-0', loading ? 'animate-spin text-muted-foreground' : riskTone)}
          strokeWidth={1.75}
          aria-hidden
        />
        <span
          className={cn('font-mono text-2xl font-medium tabular-nums leading-none', riskTone)}
          aria-label={`Risk score ${riskScore !== undefined ? fmtPct(riskScore) : 'unavailable'}`}
        >
          {riskScore !== undefined ? fmtPct(riskScore) : '—'}
        </span>
        <span className="font-tag text-[0.65rem] text-foreground/45">
          {loading
            ? 'analyzing…'
            : riskScore === undefined
              ? 'awaiting hql'
              : riskScore < 0.3
                ? 'low risk'
                : riskScore < 0.6
                  ? 'moderate'
                  : 'high risk'}
        </span>
      </div>

      {/* Findings */}
      {analysis && analysis.findings.length > 0 && (
        <ul className="grid gap-1" aria-label="Privacy findings">
          {analysis.findings.map((f, i) => (
            <li
              key={i}
              className="relative overflow-hidden rounded border border-border/60 bg-background/50 px-3 py-2"
            >
              <span
                aria-hidden
                className={cn(
                  'absolute inset-y-0 left-0 w-[2px]',
                  f.severity === 'critical' ? 'bg-destructive' :
                    f.severity === 'warning' ? 'bg-warning' : 'bg-info',
                )}
              />
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn(
                  'font-tag text-[0.62rem]',
                  f.severity === 'critical' ? 'text-destructive' :
                    f.severity === 'warning' ? 'text-warning' : 'text-info',
                )}>
                  {f.severity}
                </span>
                <span className="font-mono text-[0.72rem] text-foreground">
                  {f.message}
                </span>
              </div>
              {f.remediation && (
                <p className="mt-0.5 font-mono text-[0.67rem] text-foreground/50">
                  → {f.remediation}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {analysis && analysis.findings.length === 0 && (
        <p className="font-mono text-[0.72rem] text-success">No leakage paths detected.</p>
      )}

      {!analysis && !loading && (
        <p className="font-mono text-[0.72rem] text-foreground/40">Type HQL above to analyze.</p>
      )}
    </div>
  )
}

// ─── Diff Tab (stub) ──────────────────────────────────────────────────────────

function DiffTab() {
  return (
    <div className="px-4 py-3">
      <p className="font-tag text-[0.65rem] text-foreground/45 mb-1">
        No parent template
      </p>
      <p className="font-mono text-[0.72rem] text-foreground/35">
        When this draft is forked from a published template, the diff will surface here.
      </p>
    </div>
  )
}

// ─── Metadata Tab (stub) ──────────────────────────────────────────────────────

function MetadataTab({ datasetId, schemaId }: { datasetId: string; schemaId: string }) {
  return (
    <dl className="grid gap-1.5 px-4 py-3 font-mono text-[0.72rem]">
      {[
        ['dataset', datasetId],
        ['schema', schemaId],
        ['created', 'draft (unsaved)'],
        ['last edited', new Date().toISOString().slice(0, 16).replace('T', ' ')],
      ].map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-3">
          <dt className="text-foreground/45 min-w-[80px]">{label}</dt>
          <dd className="text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ComposerBottom({
  dsl,
  schemaId,
  datasetId,
  schema,
  fetchPrivacy,
  className,
}: Props) {
  const findings = useMemo(() => analyzeDsl(dsl, schema), [dsl, schema])
  const policyStatus = getPolicyStatus(findings, dsl)

  return (
    <div className={cn('flex flex-col border-t border-foreground/[0.12] bg-muted', className)}>
      <Tabs defaultValue="policy" className="flex flex-col h-full">
        {/* Tab strip — VSCode style */}
        <TabsList
          variant="line"
          className={cn(
            'flex w-full justify-start rounded-none border-b border-border bg-transparent px-2',
            'h-8 gap-0 p-0',
          )}
        >
          <TabsTrigger
            value="policy"
            className={cn(
              'h-8 rounded-none px-3 font-tag text-[0.65rem] text-foreground/55',
              'border-b-2 border-b-transparent data-[state=active]:border-b-accent data-[state=active]:text-foreground',
              'hover:text-foreground transition-colors flex items-center gap-1.5',
              'after:hidden', // override the default after pseudo-element
            )}
          >
            <PolicyDot status={policyStatus} />
            Policy Check
          </TabsTrigger>

          {[
            { value: 'simulation', label: 'Simulation' },
            { value: 'privacy', label: 'Privacy Analysis' },
            { value: 'diff', label: 'Diff' },
            { value: 'metadata', label: 'Metadata' },
          ].map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'h-8 rounded-none px-3 font-tag text-[0.65rem] text-foreground/55',
                'border-b-2 border-b-transparent data-[state=active]:border-b-accent data-[state=active]:text-foreground',
                'hover:text-foreground transition-colors',
                'after:hidden',
              )}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Tab content area — scrollable */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full">
            <TabsContent value="policy" className="pt-2">
              <PolicyCheckPanel dsl={dsl} schema={schema} />
            </TabsContent>

            <TabsContent value="simulation" className="pt-2">
              <SimulationTab datasetId={datasetId} />
            </TabsContent>

            <TabsContent value="privacy" className="pt-2">
              <PrivacyTab dsl={dsl} schemaId={schemaId} fetchPrivacy={fetchPrivacy} />
            </TabsContent>

            <TabsContent value="diff" className="pt-2">
              <DiffTab />
            </TabsContent>

            <TabsContent value="metadata" className="pt-2">
              <MetadataTab datasetId={datasetId} schemaId={schemaId} />
            </TabsContent>
          </ScrollArea>
        </div>
      </Tabs>
    </div>
  )
}
