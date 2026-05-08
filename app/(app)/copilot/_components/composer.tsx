'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  function submit() {
    if (text.trim().length === 0) return
    onSend(text)
    setText('')
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="flex items-end gap-2 border-t border-border bg-background p-3"
    >
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Ask anything — Copilot will reach for templates and cite attestations."
        className="flex-1 resize-none rounded-md border border-border bg-surface/40 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button type="submit" disabled={text.trim().length === 0}>
        <Send className="size-3.5" /> Send
      </Button>
    </form>
  )
}
