'use client'

import { useTransition, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Suggestion = { question: string; templateHint?: string }

export function AskAnythingInput({
  datasetId,
  suggestions,
  onAsk,
}: {
  datasetId: string
  suggestions: Suggestion[]
  onAsk: (q: string) => Promise<{ href: string }>
}) {
  const [q, setQ] = useState('')
  const [isPending, start] = useTransition()

  function ask(text: string) {
    start(async () => {
      const r = await onAsk(text)
      window.location.assign(r.href)
    })
  }

  return (
    <div className="grid gap-2">
      <form
        className="flex gap-2"
        action={(form) => {
          const text = form.get('q') as string
          ask(text)
        }}
      >
        <Input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Ask anything about ${datasetId}…`} />
        <Button type="submit" disabled={isPending || q.trim().length === 0}>
          <Sparkles className="size-3.5" /> Ask
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s.question}
            type="button"
            onClick={() => ask(s.question)}
            className="rounded-full border border-border bg-surface/40 px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {s.question}
          </button>
        ))}
      </div>
    </div>
  )
}
