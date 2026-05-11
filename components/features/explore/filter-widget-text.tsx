'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { TextFilter } from '@/lib/data/types'

type Props = {
  column: string
  initial: TextFilter | undefined
  onApply: (filter: TextFilter) => void
  onClear: () => void
}

export function FilterWidgetText({ column, initial, onApply, onClear }: Props) {
  const [text, setText] = useState(initial?.contains ?? '')

  return (
    <div className="grid gap-2">
      <Input
        placeholder="Contains…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onApply({ kind: 'text', column, contains: text })
        }}
      />
      <div className="flex justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setText('')
            onClear()
          }}
        >
          Clear
        </Button>
        <Button size="sm" onClick={() => onApply({ kind: 'text', column, contains: text })}>
          Apply
        </Button>
      </div>
    </div>
  )
}
