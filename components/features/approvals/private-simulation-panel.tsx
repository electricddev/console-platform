'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import type { PrivateSimulationResult } from '@/lib/api/endpoints/approvals'

type Props = {
  approvalId: string
  fetchSim: (approvalId: string) => Promise<PrivateSimulationResult>
}

export function PrivateSimulationPanel({ approvalId, fetchSim }: Props) {
  const [r, setR] = useState<PrivateSimulationResult | null>(null)
  const [busy, setBusy] = useState(false)

  async function run() {
    setBusy(true)
    const result = await fetchSim(approvalId)
    setR(result)
    setBusy(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Private simulation</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="text-xs text-muted-foreground">
          Runs against your <strong>actual</strong> data. Counterparties never see these values.
        </p>
        <Button size="sm" onClick={run} disabled={busy}>
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" />
              Running
            </>
          ) : (
            'Run private simulation'
          )}
        </Button>
        {r && (
          <div className="grid gap-1 rounded-md border border-border/60 bg-surface/30 p-3">
            <p>{r.summary}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {r.bucketCount} buckets · smallest {r.smallestBucket} · {r.rowEstimate} rows · {r.durationMs} ms
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
