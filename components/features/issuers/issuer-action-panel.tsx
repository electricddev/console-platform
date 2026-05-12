'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { IssuerRequestKind } from '@/lib/api/schemas'

type SubmitPayload = { issuerId: string; kind: IssuerRequestKind; payload: Record<string, unknown> }

export function IssuerActionPanel({ issuerId, onSubmit }: { issuerId: string; onSubmit: (payload: SubmitPayload) => void }) {
  const [mode, setMode] = useState<'none' | IssuerRequestKind>('none')
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly'>('weekly')
  const [metric, setMetric] = useState('leverage')
  const [reason, setReason] = useState('')
  const [proposal, setProposal] = useState('')

  function reset() { setMode('none'); setReason(''); setProposal(''); setMetric('leverage'); setCadence('weekly') }

  return (
    <section aria-labelledby="actions">
      <h3 id="actions" className="mb-2 font-tag text-foreground/60">{'// actions'}</h3>
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setMode('attestation-request')}>Request weekly leverage attestation</Button>
          <Button variant="outline" onClick={() => setMode('gap-acceptance')}>Mark gap as accepted</Button>
          <Button variant="ghost" onClick={() => setMode('sla-renegotiation')}>Renegotiate SLA</Button>
        </div>
      )}

      {mode === 'attestation-request' && (
        <form className="grid gap-3 rounded-md border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ issuerId, kind: 'attestation-request', payload: { cadence, metric } }); reset() }}>
          <label className="grid gap-1 text-xs">
            <span>Cadence</span>
            <select className="rounded border border-border bg-background p-2 text-sm" value={cadence} onChange={(e) => setCadence(e.target.value as typeof cadence)}>
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs">
            <span>Metric</span>
            <input className="rounded border border-border bg-background p-2 text-sm" value={metric} onChange={(e) => setMetric(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit">Submit request</Button>
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {mode === 'gap-acceptance' && (
        <form className="grid gap-3 rounded-md border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ issuerId, kind: 'gap-acceptance', payload: { reason } }); reset() }}>
          <label className="grid gap-1 text-xs">
            <span>Reason</span>
            <textarea aria-label="reason" className="min-h-16 rounded border border-border bg-background p-2 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={reason.trim().length === 0}>Submit acceptance</Button>
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}

      {mode === 'sla-renegotiation' && (
        <form className="grid gap-3 rounded-md border border-border bg-surface p-4"
          onSubmit={(e) => { e.preventDefault(); onSubmit({ issuerId, kind: 'sla-renegotiation', payload: { proposal } }); reset() }}>
          <label className="grid gap-1 text-xs">
            <span>Proposal</span>
            <textarea aria-label="proposal" className="min-h-24 rounded border border-border bg-background p-2 text-sm" value={proposal} onChange={(e) => setProposal(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={proposal.trim().length === 0}>Submit proposal</Button>
            <Button type="button" variant="ghost" onClick={reset}>Cancel</Button>
          </div>
        </form>
      )}
    </section>
  )
}
