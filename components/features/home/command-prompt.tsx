'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

type Suggestion = { id: string; label: string; href: string; tone?: 'accent' | 'neutral' }

type Props = {
  suggestions?: Suggestion[]
  className?: string
}

const ROTATING_PROMPTS = [
  'Compare default rates across vintages…',
  'Show me CreditBridge completeness over 90 days…',
  'Which datasets have anomalies this week?',
  'Draft a digest of last week\'s runs…',
  'Surface anything anomalous in mF-ONE…',
] as const

export function CommandPrompt({ suggestions = [], className }: Props) {
  const [text, setText] = useState('')
  const [promptIndex, setPromptIndex] = useState(0)
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing'>('typing')

  useEffect(() => {
    const target = ROTATING_PROMPTS[promptIndex]
    let timeout: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (text.length < target.length) {
        timeout = setTimeout(() => setText(target.slice(0, text.length + 1)), 38)
      } else {
        timeout = setTimeout(() => setPhase('holding'), 1800)
      }
    } else if (phase === 'holding') {
      timeout = setTimeout(() => setPhase('erasing'), 1100)
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(target.slice(0, text.length - 1)), 18)
      } else {
        setPromptIndex((i) => (i + 1) % ROTATING_PROMPTS.length)
        setPhase('typing')
      }
    }

    return () => clearTimeout(timeout)
  }, [text, phase, promptIndex])

  return (
    <div className={cn('grid gap-3', className)}>
      <Link
        href="/copilot"
        className={cn(
          'group relative flex items-center gap-3 overflow-hidden rounded-md border border-border bg-surface px-4 py-3 transition-all',
          'surface-glass ring-accent-soft',
          'hover:border-accent/50 active:translate-y-px',
        )}
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 accent-halo opacity-60 transition-opacity group-hover:opacity-100"
        />
        <span aria-hidden className="pointer-events-none absolute inset-0 shimmer" />
        <span className="relative flex size-7 shrink-0 items-center justify-center rounded-sm bg-foreground text-background">
          <Sparkles className="size-3.5" strokeWidth={2} />
        </span>
        <span className="relative flex min-w-0 flex-1 items-center font-mono text-[0.85rem] text-foreground/80 sm:text-[0.9rem]">
          <span className="truncate">{text}</span>
          <span className="caret ml-px inline-block h-4 w-px bg-foreground/70" aria-hidden />
        </span>
        <span className="relative hidden items-center gap-1.5 font-mono text-[0.7rem] text-muted-foreground sm:flex">
          <kbd className="rounded-sm border border-border bg-background px-1.5 py-0.5 leading-none">⌘</kbd>
          <kbd className="rounded-sm border border-border bg-background px-1.5 py-0.5 leading-none">K</kbd>
        </span>
        <ArrowRight className="relative size-4 shrink-0 text-foreground/40 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
      </Link>

      {suggestions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-tag text-foreground/45">{'// suggested'}</span>
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[0.72rem] tabular-nums transition-all active:translate-y-px',
                s.tone === 'accent'
                  ? 'border-accent/40 bg-accent/8 text-foreground hover:border-accent/70 hover:bg-accent/12'
                  : 'border-border bg-background hover:border-foreground/30 hover:bg-muted',
              )}
            >
              {s.label}
              <CornerDownLeft className="size-3 text-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
