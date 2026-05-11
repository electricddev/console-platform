'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export const EXAMPLES = [
  'Default rate by vintage with confidence intervals',
  'Concentration breaches over the last quarter',
  'Weighted-average advance rate by sector',
] as const

const MAX_PROMPT_LEN = 800

type Props = {
  datasetId: string
  initialPrompt?: string
  compact?: boolean
  onCompiled: (dsl: string) => void
  onCompileStream: (prompt: string, datasetId: string) => AsyncIterable<string>
  /** Called when focus enters the NL textarea, so the shell tracks active surface */
  onFocus?: () => void
  /** Called when focus leaves the NL textarea */
  onBlur?: () => void
}

export function NlInput({
  datasetId,
  initialPrompt,
  compact,
  onCompiled,
  onCompileStream,
  onFocus,
  onBlur,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt ?? '')
  const [focused, setFocused] = useState(false)
  const [isPending, start] = useTransition()
  const [streamed, setStreamed] = useState('')
  const [streamDone, setStreamDone] = useState(false)
  const [lineCount, setLineCount] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Compact when parent forces it (HQL is present), or when unfocused with no text.
  // Expands on focus regardless of text content so users can see what they're typing.
  const isCompact = compact || (!focused && prompt.length === 0)

  const compile = useCallback(
    (text: string) => {
      if (!text.trim()) return
      setPrompt(text)
      setStreamed('')
      setStreamDone(false)
      setLineCount(0)
      start(async () => {
        let acc = ''
        for await (const chunk of onCompileStream(text, datasetId)) {
          acc += chunk
          setStreamed(acc)
        }
        const lines = acc.split('\n').filter(Boolean).length
        setLineCount(lines)
        setStreamDone(true)
        onCompiled(acc)
      })
    },
    [datasetId, onCompileStream, onCompiled],
  )

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      compile(prompt)
    }
  }

  const charsLeft = MAX_PROMPT_LEN - prompt.length
  const isOverLimit = charsLeft < 0

  return (
    <section
      aria-labelledby="nl-section-title"
      className={cn(
        'border-b border-border bg-surface transition-all duration-200',
        isCompact ? 'px-6 md:px-8 py-2' : 'px-6 md:px-8 py-3',
      )}
    >
      {/* Header row */}
      <div className={cn('flex items-baseline justify-between gap-4', isCompact ? 'mb-1' : 'mb-2')}>
        <h2
          id="nl-section-title"
          className={cn(
            'font-display tracking-tight text-foreground transition-all duration-200',
            isCompact ? 'text-sm' : 'text-lg',
          )}
        >
          Ask the room
        </h2>
        <span className="font-tag text-foreground/55 shrink-0">
          natural language → hql
        </span>
      </div>

      {/* Input container — defined by a left rail + subtle bg ramp on focus */}
      <div
        className={cn(
          'relative rounded border border-border/60 bg-background transition-colors duration-200',
          'focus-within:border-accent/50 focus-within:shadow-[0_0_0_3px_var(--accent)/8%]',
          isOverLimit && 'border-destructive/50',
        )}
      >
        {/* Leading gutter indicator */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-2 font-mono text-[0.8rem] text-accent/40 select-none md:left-4"
        >
          {'▎'}
        </span>

        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, MAX_PROMPT_LEN + 20))}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setFocused(true)
            onFocus?.()
          }}
          onBlur={() => {
            setFocused(false)
            onBlur?.()
          }}
          rows={1}
          aria-label="Natural-language prompt"
          placeholder="e.g. Weighted average advance rate by sector for the last quarter, with bucket size at least 10."
          className={cn(
            'w-full resize-none bg-transparent pl-8 pr-12 py-2 font-mono text-sm leading-relaxed text-foreground',
            'placeholder:text-muted-foreground/45',
            'focus:outline-none transition-[height] duration-200',
            isCompact ? 'h-[2.75rem]' : 'h-[6rem]',
          )}
        />

        {/* Char counter */}
        <span
          aria-live="polite"
          className={cn(
            'pointer-events-none absolute bottom-3 right-3 font-mono text-[0.65rem] tabular-nums',
            isOverLimit ? 'text-destructive' : charsLeft < 100 ? 'text-warning' : 'text-foreground/30',
          )}
        >
          {charsLeft}
        </span>

        {/* Streaming output — within the same bordered container */}
        {(isPending || streamed) && (
          <div className="border-t border-border/50 mx-0">
            {/* Status row */}
            <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/30">
              <span className="font-tag text-[0.62rem] text-foreground/55">
                <span aria-hidden>{'// '}</span>
                {streamDone
                  ? `compiled · ${lineCount} line${lineCount !== 1 ? 's' : ''}`
                  : 'streaming…'}
              </span>
              {isPending && (
                <span
                  aria-label="Live data"
                  className="inline-block size-1.5 rounded-full bg-accent animate-pulse"
                />
              )}
            </div>

            {/* Preview */}
            <pre
              aria-live="polite"
              aria-label="Compiled HQL preview"
              className="overflow-x-auto px-4 py-2 font-mono text-[0.72rem] leading-relaxed text-foreground max-h-[100px] overflow-y-auto"
            >
              {streamed}
              {isPending && (
                <span
                  aria-hidden
                  className="caret ml-px inline-block h-[1em] w-px align-middle bg-foreground/60"
                />
              )}
            </pre>
          </div>
        )}
      </div>

      {/* Quick-start chips */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setPrompt(example)
              textareaRef.current?.focus()
            }}
            className={cn(
              'rounded-full border border-border bg-background px-2.5 py-0.5 font-mono text-[0.68rem] text-muted-foreground',
              'transition-all hover:border-foreground/30 hover:bg-muted hover:text-foreground active:translate-y-px',
              isCompact ? 'opacity-60 h-6' : 'h-7',
            )}
          >
            {example}
          </button>
        ))}
      </div>

      {/* Compile action row — separated so the CTA always pins right */}
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/40 pt-2">
        <p className="font-mono text-[0.62rem] text-foreground/30">
          <kbd className="rounded-sm border border-border bg-muted px-1 py-px font-mono text-[0.6rem] leading-none">⌘</kbd>
          {' '}
          <kbd className="rounded-sm border border-border bg-muted px-1 py-px font-mono text-[0.6rem] leading-none">↵</kbd>
          {' '}to compile
        </p>
        <button
          type="button"
          onClick={() => compile(prompt)}
          disabled={isPending || prompt.trim().length === 0 || isOverLimit}
          className={cn(
            'inline-flex items-center gap-2 rounded border border-foreground bg-foreground px-3 py-1.5',
            'font-mono text-[0.75rem] text-background transition-all',
            'hover:bg-foreground/85 active:translate-y-px',
            'disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          {isPending
            ? <Loader2 className="size-3 animate-spin" aria-hidden />
            : null}
          {isPending ? 'Compiling…' : 'Compile →'}
        </button>
      </div>
    </section>
  )
}
