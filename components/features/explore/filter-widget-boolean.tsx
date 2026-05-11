'use client'

import { useState } from 'react'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { BooleanFilter } from '@/lib/data/types'

type Props = {
  column: string
  initial: BooleanFilter | undefined
  onApply: (filter: BooleanFilter) => void
  onClear: () => void
}

export function FilterWidgetBoolean({ column, initial, onApply, onClear }: Props) {
  const [value, setValue] = useState<'true' | 'false' | 'any'>(
    initial?.value === true ? 'true' : initial?.value === false ? 'false' : 'any'
  )

  function apply() {
    const v: boolean | null = value === 'true' ? true : value === 'false' ? false : null
    onApply({ kind: 'boolean', column, value: v })
  }

  return (
    <div className="grid gap-2">
      <RadioGroup
        value={value}
        onValueChange={(v) => setValue(v as 'true' | 'false' | 'any')}
        className="grid gap-1"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="any" id="any" />
          <Label htmlFor="any">Any</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="true" id="yes" />
          <Label htmlFor="yes">Yes</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="false" id="no" />
          <Label htmlFor="no">No</Label>
        </div>
      </RadioGroup>
      <div className="flex justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setValue('any')
            onClear()
          }}
        >
          Clear
        </Button>
        <Button size="sm" onClick={apply}>Apply</Button>
      </div>
    </div>
  )
}
