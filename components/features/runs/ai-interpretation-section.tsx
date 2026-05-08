'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { RunSummary } from '@/lib/api/endpoints/ai'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyableHash } from '@/components/common/copyable-hash'

type Props = {
  runId: string
  fetchSummary: (runId: string) => Promise<RunSummary>
}

export function AiInterpretationSection({ runId, fetchSummary }: Props) {
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchSummary(runId)
      .then((s) => { if (!cancelled) setSummary(s) })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load summary')
      })
    return () => { cancelled = true }
  }, [runId, fetchSummary])

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-sm font-medium">AI Interpretation</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {!summary && !error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Generating summary…
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {summary && (
          <div className="grid gap-3">
            <p className="text-sm leading-relaxed">{summary.text}</p>

            <div className="flex items-center gap-2">
              <span className="font-tag text-xs text-foreground/60">Confidence</span>
              <span className="font-mono text-xs tabular-nums">
                {(summary.confidence * 100).toFixed(0)}%
              </span>
            </div>

            {summary.evidenceRunIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-tag text-xs text-foreground/60">Evidence</span>
                {summary.evidenceRunIds.map((id) => (
                  <CopyableHash key={id} value={id} short={false} className="text-xs" />
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
