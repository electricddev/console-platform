'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { fmtPct } from '@/lib/format'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

type Props = {
  dsl: string
  schemaId: string
  fetchAnalysis: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
}

const severityClass = {
  info: 'text-muted-foreground',
  warning: 'text-yellow-500',
  critical: 'text-destructive',
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

  const RiskIcon =
    loading
      ? Loader2
      : analysis?.riskScore === undefined
        ? ShieldQuestion
        : analysis.riskScore < 0.3
          ? ShieldCheck
          : ShieldAlert

  const iconClass =
    loading
      ? 'animate-spin text-muted-foreground'
      : analysis?.riskScore === undefined
        ? 'text-muted-foreground'
        : analysis.riskScore < 0.3
          ? 'text-green-500'
          : 'text-yellow-500'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 border-b [.border-b]:pb-3">
        <RiskIcon className={`size-4 ${iconClass}`} />
        <CardTitle className="text-sm font-medium">Privacy analysis</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 pt-3 text-sm">
        {analysis ? (
          <>
            <p className="text-xs">
              Risk score:{' '}
              <strong
                className={
                  analysis.riskScore < 0.3
                    ? 'text-green-500'
                    : analysis.riskScore < 0.6
                      ? 'text-yellow-500'
                      : 'text-destructive'
                }
              >
                {fmtPct(analysis.riskScore)}
              </strong>
            </p>
            <ul className="grid gap-1.5">
              {analysis.findings.map((f, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border/60 bg-card/50 p-2"
                >
                  <p className={`text-xs font-medium ${severityClass[f.severity]}`}>
                    {f.message}
                  </p>
                  {f.remediation && (
                    <p className="mt-0.5 text-[0.7rem] text-muted-foreground">
                      → {f.remediation}
                    </p>
                  )}
                </li>
              ))}
              {analysis.findings.length === 0 && (
                <p className="text-xs text-muted-foreground">No leakage paths detected.</p>
              )}
            </ul>
          </>
        ) : loading ? (
          <p className="text-xs text-muted-foreground">Analyzing DSL…</p>
        ) : (
          <p className="text-xs text-muted-foreground">Type DSL above to analyze.</p>
        )}
      </CardContent>
    </Card>
  )
}
