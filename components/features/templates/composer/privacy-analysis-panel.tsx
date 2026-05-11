'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtPct } from '@/lib/format'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

type Props = {
  dsl: string
  schemaId: string
  fetchAnalysis: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
}

const SEVERITY_TONE = {
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-destructive',
} as const

const SEVERITY_RAIL = {
  info: 'bg-info',
  warning: 'bg-warning',
  critical: 'bg-destructive',
} as const

export function PrivacyAnalysisPanel({ dsl, schemaId, fetchAnalysis }: Props) {
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
        const r = await fetchAnalysis({ dsl, schemaId })
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
  }, [dsl, schemaId, fetchAnalysis])

  const riskScore = analysis?.riskScore
  const riskTone =
    riskScore === undefined
      ? 'text-muted-foreground'
      : riskScore < 0.3
        ? 'text-success'
        : riskScore < 0.6
          ? 'text-warning'
          : 'text-destructive'

  const RiskIcon =
    loading
      ? Loader2
      : riskScore === undefined
        ? ShieldQuestion
        : riskScore < 0.3
          ? ShieldCheck
          : ShieldAlert

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-header */}
      <div className="flex items-center gap-2">
        <RiskIcon
          className={cn('size-4', loading ? 'animate-spin text-muted-foreground' : riskTone)}
          strokeWidth={1.75}
          aria-hidden
        />
        <h3 className="font-display text-xl tracking-tight text-foreground">
          Privacy
        </h3>
        <span className="ml-auto font-tag text-foreground/55">
          <span aria-hidden>{'// '}</span>
          {'risk analysis'}
        </span>
      </div>

      {/* Risk score — large mono number */}
      <div className="flex items-baseline gap-3">
        <span
          className={cn(
            'font-mono text-4xl font-medium tabular-nums leading-none tracking-tight',
            riskTone,
          )}
          aria-label={`Risk score ${riskScore !== undefined ? fmtPct(riskScore) : 'unavailable'}`}
        >
          {riskScore !== undefined ? fmtPct(riskScore) : '—'}
        </span>
        <span className="font-tag text-foreground/45">
          {loading
            ? 'analyzing…'
            : riskScore === undefined
              ? 'awaiting dsl'
              : riskScore < 0.3
                ? '// low risk'
                : riskScore < 0.6
                  ? '// moderate'
                  : '// high risk'}
        </span>
      </div>

      {/* Findings list */}
      {analysis && (
        <ul className="mt-1 grid gap-2" aria-label="Privacy findings">
          {analysis.findings.length === 0 ? (
            <li className="font-mono text-[0.78rem] text-muted-foreground">
              No leakage paths detected.
            </li>
          ) : (
            analysis.findings.map((f, i) => (
              <li
                key={i}
                className="relative overflow-hidden rounded-md border border-border/70 bg-background/60 px-4 py-3"
              >
                {/* Severity rail */}
                <span
                  aria-hidden
                  className={cn('absolute inset-y-0 left-0 w-[3px]', SEVERITY_RAIL[f.severity])}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('font-tag', SEVERITY_TONE[f.severity])}>
                    <span aria-hidden>{'// '}</span>
                    {f.severity}
                  </span>
                  <p className="font-mono text-[0.78rem] text-foreground">
                    {f.message}
                  </p>
                </div>

                {f.remediation && (
                  <p className="mt-1 font-mono text-[0.7rem] text-muted-foreground">
                    → {f.remediation}
                  </p>
                )}
              </li>
            ))
          )}
        </ul>
      )}

      {!analysis && !loading && (
        <p className="font-mono text-[0.78rem] text-muted-foreground">
          Type DSL above to analyze.
        </p>
      )}

      {loading && !analysis && (
        <p className="font-mono text-[0.78rem] text-muted-foreground">
          Analyzing DSL…
        </p>
      )}
    </div>
  )
}
