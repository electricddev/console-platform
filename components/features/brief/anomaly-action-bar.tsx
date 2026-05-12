'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  anomalyId: string
  onDismiss: (reason: string) => void
  onPinToMemo: () => void
  onConvertToRule: () => void
}

export function AnomalyActionBar({ anomalyId, onDismiss, onPinToMemo, onConvertToRule }: Props) {
  void anomalyId
  const [mode, setMode] = useState<'none' | 'dismiss'>('none')
  const [reason, setReason] = useState('')

  return (
    <div className="mt-2 grid gap-2">
      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode('dismiss')}>Dismiss</Button>
          <Button size="sm" variant="outline" onClick={onPinToMemo}>Pin to memo</Button>
          <Button size="sm" variant="outline" onClick={onConvertToRule}>Convert to alert rule</Button>
        </div>
      )}
      {mode === 'dismiss' && (
        <div className="grid gap-2 rounded-md border border-border bg-surface p-3">
          <label className="grid gap-1 text-xs">
            <span>Reason:</span>
            <textarea aria-label="reason" value={reason} onChange={(e) => setReason(e.target.value)}
              className="min-h-16 rounded-md border border-border bg-background p-2" />
          </label>
          <div className="flex gap-2">
            <Button size="sm" disabled={reason.trim().length === 0}
              onClick={() => { onDismiss(reason.trim()); setReason(''); setMode('none') }}>Save dismissal</Button>
            <Button size="sm" variant="ghost" onClick={() => { setReason(''); setMode('none') }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
