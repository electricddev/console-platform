'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'

export function SimulationPanel({ datasetId }: { datasetId: string }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<{ rows: number; durationMs: number } | null>(null)

  async function simulate() {
    setRunning(true)
    await new Promise<void>((r) => setTimeout(r, 900))
    setResult({
      rows: 47 + Math.floor(Math.random() * 40),
      durationMs: 1240 + Math.floor(Math.random() * 600),
    })
    setRunning(false)
  }

  return (
    <Card>
      <CardHeader className="border-b [.border-b]:pb-3">
        <CardTitle className="text-sm font-medium">Simulation on synthetic data</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 pt-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Runs your DSL against a sandboxed copy of{' '}
          <span className="font-mono text-foreground/70">{datasetId}</span>. Originator
          data never leaves the enclave.
        </p>
        <Button size="sm" onClick={simulate} disabled={running}>
          {running ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Play className="size-3.5" />
          )}
          {running ? 'Running…' : 'Run on sandbox'}
        </Button>
        {result && (
          <div className="rounded-md border border-border/60 bg-card/50 p-2.5 font-mono text-xs text-foreground">
            <span className="text-green-500">✓</span> {result.rows} rows ·{' '}
            {result.durationMs.toLocaleString()} ms
          </div>
        )}
      </CardContent>
    </Card>
  )
}
