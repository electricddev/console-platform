'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThresholdSliderPopover } from './threshold-slider-popover'

const SLIDER_SPECS: Record<string, { metric: string; min: number; max: number; step: number; initial: number }> = {
  'acred.non_accrual_rising': { metric: 'non_accrual_delta', min: 0.05, max: 0.50, step: 0.01, initial: 0.20 },
  'acred.non_accrual_high':   { metric: 'non_accrual',       min: 0.5,  max: 3.0,  step: 0.05, initial: 1.5 },
  'acred.leverage_drift':     { metric: 'leverage_delta',    min: 0.5,  max: 5.0,  step: 0.1,  initial: 2.0 },
  'acred.leverage_high':      { metric: 'leverage',          min: 0.60, max: 0.90, step: 0.01, initial: 0.75 },
  'acred.top10_drift':        { metric: 'top10_delta',       min: 0.5,  max: 5.0,  step: 0.1,  initial: 2.0 },
  'acred.pik_rising':         { metric: 'pik',               min: 3,    max: 15,   step: 0.5,  initial: 8 },
}

type Props = {
  flagId: string
  datasetId: string
  sliderEligible: boolean
  onAcknowledge: (note: string) => void
  onSnooze: () => void
  onSetThreshold: (metric: string, value: number) => void
}

export function RedFlagActionBar({ flagId, datasetId, sliderEligible, onAcknowledge, onSnooze, onSetThreshold }: Props) {
  void datasetId
  const [mode, setMode] = useState<'none' | 'ack' | 'threshold'>('none')
  const [note, setNote] = useState('')
  const spec = SLIDER_SPECS[flagId]
  const canSlider = sliderEligible && Boolean(spec)

  return (
    <div className="mt-2 grid gap-2">
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode('ack')}>Acknowledge</Button>
          <Button size="sm" variant="outline" onClick={onSnooze}>Snooze 7d</Button>
          {canSlider && <Button size="sm" variant="outline" onClick={() => setMode('threshold')}>Set threshold</Button>}
        </div>
      )}
      {mode === 'ack' && (
        <div className="grid gap-2 rounded-md border border-border bg-surface p-3">
          <label className="grid gap-1 text-xs">
            <span>Note:</span>
            <textarea aria-label="note" value={note} onChange={(e) => setNote(e.target.value)}
              className="min-h-16 rounded-md border border-border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={note.trim().length === 0}
              onClick={() => { onAcknowledge(note.trim()); setNote(''); setMode('none') }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setNote(''); setMode('none') }}>Cancel</Button>
          </div>
        </div>
      )}
      {mode === 'threshold' && spec && (
        <ThresholdSliderPopover
          metric={spec.metric} min={spec.min} max={spec.max} step={spec.step} initial={spec.initial}
          onSet={(v) => { onSetThreshold(spec.metric, v); setMode('none') }}
          onCancel={() => setMode('none')}
        />
      )}
    </div>
  )
}
