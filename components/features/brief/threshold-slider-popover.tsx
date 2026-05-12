'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

type Props = {
  metric: string
  min: number
  max: number
  step: number
  initial: number
  onSet: (value: number) => void
  onCancel: () => void
}

export function ThresholdSliderPopover({ metric, min, max, step, initial, onSet, onCancel }: Props) {
  const [value, setValue] = useState(initial)
  return (
    <div className="grid gap-2 rounded-md border border-border bg-surface p-3">
      <label className="grid gap-1 text-xs">
        <span>{metric} threshold: <span className="tabular-nums">{value}</span></span>
        <input
          aria-label={`${metric} threshold`}
          type="range" min={min} max={max} step={step}
          value={value} onChange={(e) => setValue(parseFloat(e.target.value))}
          className="w-full"
        />
      </label>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSet(value)}>Save threshold</Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  )
}
