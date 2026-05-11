'use client'

import { Textarea } from '@/components/ui/textarea'

type Props = {
  value: string
  onChange: (v: string) => void
}

export function CellMarkdownEditor({ value, onChange }: Props) {
  return (
    <Textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="# Section heading…"
      rows={4}
      className="font-mono text-sm"
    />
  )
}
