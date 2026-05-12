'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { AlertChannel, AlertRule } from '@/lib/api/schemas'

type Payload = Omit<AlertRule, 'id' | 'createdBy' | 'createdAt'>

const METRICS = ['leverage', 'nonAccrualPct', 'top10ConcentrationPct', 'pikPct'] as const

export function AlertRuleForm({ channels, onSubmit }: { channels: AlertChannel[]; onSubmit: (payload: Payload) => void }) {
  const [label, setLabel] = useState('')
  const [metric, setMetric] = useState<typeof METRICS[number]>('leverage')
  const [threshold, setThreshold] = useState<number>(0.75)
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [selectedChannels, setSelectedChannels] = useState<string[]>([])

  function toggleChannel(id: string) {
    setSelectedChannels((cur) => cur.includes(id) ? cur.filter((c) => c !== id) : [...cur, id])
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      label, enabled: true,
      condition: { metric, threshold, direction },
      scope: { datasetIds: [], kinds: [], severities: [] },
      channelIds: selectedChannels,
    })
  }

  return (
    <form className="grid gap-3 rounded-md border border-border bg-surface p-4" onSubmit={handleSubmit}>
      <label className="grid gap-1 text-xs"><span>Label</span>
        <input value={label} onChange={(e) => setLabel(e.target.value)} className="rounded border border-border bg-background p-2 text-sm" required />
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-xs"><span>Metric</span>
          <select value={metric} onChange={(e) => setMetric(e.target.value as typeof METRICS[number])} className="rounded border border-border bg-background p-2 text-sm">
            {METRICS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs"><span>Direction</span>
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'above' | 'below')} className="rounded border border-border bg-background p-2 text-sm">
            <option value="above">Above</option><option value="below">Below</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs"><span>Threshold</span>
          <input type="number" step="any" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="rounded border border-border bg-background p-2 text-sm" required />
        </label>
      </div>
      <fieldset className="grid gap-1 text-xs">
        <legend>Channels</legend>
        {channels.length === 0 && <p className="text-muted-foreground">No channels yet — add one in the Channels tab.</p>}
        {channels.map((c) => (
          <label key={c.id} className="flex items-center gap-2">
            <input type="checkbox" aria-label={`channel ${c.id}`} checked={selectedChannels.includes(c.id)} onChange={() => toggleChannel(c.id)} />
            <span>{c.label} <span className="text-muted-foreground">({c.kind})</span></span>
          </label>
        ))}
      </fieldset>
      <Button type="submit">Save rule</Button>
    </form>
  )
}
