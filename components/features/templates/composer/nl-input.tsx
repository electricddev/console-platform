'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const EXAMPLES = [
  'Weighted-average advance rate by sector',
  'Concentration breaches over the last quarter',
  'Default rate by vintage with confidence intervals',
] as const

type Props = {
  datasetId: string
  onCompiled: (dsl: string) => void
  onCompileStream: (prompt: string, datasetId: string) => AsyncIterable<string>
}

export function NlInput({ datasetId, onCompiled, onCompileStream }: Props) {
  const [prompt, setPrompt] = useState('')
  const [isPending, start] = useTransition()
  const [streamed, setStreamed] = useState('')

  function compile(text: string) {
    setPrompt(text)
    setStreamed('')
    start(async () => {
      let acc = ''
      for await (const chunk of onCompileStream(text, datasetId)) {
        acc += chunk
        setStreamed(acc)
      }
      onCompiled(acc)
      setStreamed('')
    })
  }

  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card/40 p-4">
      <label className="font-mono text-xs text-foreground/55">describe what you want to know</label>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="e.g. Weighted average advance rate by sector for the last quarter, with bucket size at least 10."
        className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 placeholder:text-muted-foreground"
      />
      <div className="flex flex-wrap items-center gap-2">
        {EXAMPLES.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => compile(e)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {e}
          </button>
        ))}
        <Button
          className="ml-auto"
          onClick={() => compile(prompt)}
          disabled={isPending || prompt.trim().length === 0}
        >
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Compile to DSL
        </Button>
      </div>
      {streamed && (
        <div className="rounded-md border border-border/60 bg-background p-3 text-xs">
          <p className="font-mono text-[0.7rem] text-foreground/55 mb-1">streaming…</p>
          <pre className="whitespace-pre-wrap font-mono text-[0.72rem] text-foreground">{streamed}</pre>
        </div>
      )}
    </div>
  )
}
