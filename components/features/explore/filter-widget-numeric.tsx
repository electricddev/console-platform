'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { NumericFilter } from '@/lib/data/types'

type Props = {
  column: string
  initial: NumericFilter | undefined
  onApply: (filter: NumericFilter) => void
  onClear: () => void
}

export function FilterWidgetNumeric({ column, initial, onApply, onClear }: Props) {
  const [min, setMin] = useState(initial?.min?.toString() ?? '')
  const [max, setMax] = useState(initial?.max?.toString() ?? '')

  function apply() {
    const f: NumericFilter = { kind: 'numeric', column }
    if (min !== '') f.min = Number(min)
    if (max !== '') f.max = Number(max)
    onApply(f)
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Min" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} />
        <Input placeholder="Max" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} />
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
        <Button size="sm" onClick={apply}>Apply</Button>
      </div>
    </div>
  )
}
