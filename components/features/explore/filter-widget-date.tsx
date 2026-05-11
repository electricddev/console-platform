'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { DateFilter } from '@/lib/data/types'

type Props = {
  column: string
  initial: DateFilter | undefined
  onApply: (filter: DateFilter) => void
  onClear: () => void
}

export function FilterWidgetDate({ column, initial, onApply, onClear }: Props) {
  const [from, setFrom] = useState(initial?.fromISO ?? '')
  const [to, setTo] = useState(initial?.toISO ?? '')

  function apply() {
    const f: DateFilter = { kind: 'date', column }
    if (from) f.fromISO = from
    if (to) f.toISO = to
    onApply(f)
  }

  return (
    <div className="grid gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>
        <Button size="sm" onClick={apply}>Apply</Button>
      </div>
    </div>
  )
}
