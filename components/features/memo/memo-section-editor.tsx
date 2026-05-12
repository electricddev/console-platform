// components/features/memo/memo-section-editor.tsx
'use client'
import { useState, useEffect, useRef } from 'react'

type Props = {
  initialMarkdown: string
  onSave: (markdown: string) => Promise<void>
  readOnly?: boolean
}

export function MemoSectionEditor({ initialMarkdown, onSave, readOnly }: Props) {
  const [value, setValue] = useState(initialMarkdown)
  const [saving, setSaving] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  function handleChange(next: string) {
    setValue(next)
    if (readOnly) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSaving(true)
      try { await onSave(next) } finally { setSaving(false) }
    }, 600)
  }

  return (
    <div className="grid gap-1">
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        disabled={readOnly}
        placeholder="Write your analysis here…"
        className="min-h-32 w-full rounded-md border border-border bg-background p-3 text-sm leading-relaxed disabled:opacity-60"
      />
      <p className="text-xs text-muted-foreground">{saving ? 'Saving…' : 'Auto-saves after a pause.'}</p>
    </div>
  )
}
