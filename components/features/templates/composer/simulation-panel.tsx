'use client'

import { useState } from 'react'
import { Play, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    <div className="flex flex-col gap-4">
      {/* Sub-header */}
      <div className="flex items-center gap-2">
        <h3 className="font-display text-xl tracking-tight text-foreground">
          Simulation
        </h3>
        <span className="ml-auto font-tag text-foreground/55">
          <span aria-hidden>{'// '}</span>
          {'sandbox · synthetic'}
        </span>
      </div>

      {/* Description */}
      <p className="font-mono text-[0.78rem] text-muted-foreground leading-relaxed">
        Runs your DSL against a sandboxed copy of{' '}
        <span className="font-mono text-foreground/70">{datasetId}</span>
        {'. '}
        Originator data never leaves the enclave.
      </p>

      {/* Run button */}
      <button
        type="button"
        onClick={simulate}
        disabled={running}
        className={cn(
          'inline-flex items-center gap-2 self-start rounded-md border border-foreground bg-foreground px-4 py-2 font-mono text-[0.8rem] text-background transition-all',
          'hover:bg-foreground/85 active:translate-y-px',
          'disabled:cursor-not-allowed disabled:opacity-40',
        )}
      >
        {running
          ? <Loader2 className="size-3.5 animate-spin" aria-hidden />
          : <Play className="size-3.5" aria-hidden />}
        {running ? 'Running…' : 'Run on sandbox'}
      </button>

      {/* Result */}
      {result && (
        <div className="rounded-md border border-border/70 bg-background/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-3.5 text-success shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="font-tag text-success">
              <span aria-hidden>{'// '}</span>
              {'complete'}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[0.75rem] tabular-nums">
            <div className="flex flex-col gap-0.5">
              <span className="font-tag text-foreground/45">Rows</span>
              <span className="text-foreground">{result.rows}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-tag text-foreground/45">Runtime</span>
              <span className="text-foreground">{result.durationMs.toLocaleString()} ms</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
