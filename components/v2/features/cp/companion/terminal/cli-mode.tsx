'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useCompanionContext } from '../companion-context'
import { parseCommand, runCommand, completeCommand, type CliOutputBlock } from './cli-commands'

type ScrollbackEntry = { input: string; outputs: CliOutputBlock[] }

const MAX_SCROLLBACK = 200

export function CliMode() {
  const ctx = useCompanionContext()
  const [scrollback, setScrollback] = useState<ScrollbackEntry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [scrollback])

  const submit = useCallback(() => {
    const raw = draft.trim()
    if (!raw) return

    const parsed = parseCommand(raw)
    if (parsed?.name === 'clear') {
      setScrollback([])
    } else if (parsed?.name === 'history') {
      const lines = history.length
        ? history.slice().reverse().map((h, i) => `${String(i + 1).padStart(3, ' ')}  ${h}`)
        : ['(no history yet)']
      setScrollback((s) =>
        [...s, { input: raw, outputs: [{ kind: 'text' as const, lines }] }].slice(-MAX_SCROLLBACK),
      )
    } else {
      const outputs = runCommand(raw, ctx)
      setScrollback((s) => [...s, { input: raw, outputs }].slice(-MAX_SCROLLBACK))
    }

    setHistory((h) => [raw, ...h].slice(0, MAX_SCROLLBACK))
    setHistoryIdx(-1)
    setDraft('')
  }, [draft, ctx, history])

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const matches = completeCommand(draft)
      if (matches.length === 1) {
        setDraft(matches[0] + ' ')
      } else if (matches.length > 1) {
        setScrollback((s) =>
          [
            ...s,
            { input: draft, outputs: [{ kind: 'text' as const, lines: [matches.join('  ')] }] },
          ].slice(-MAX_SCROLLBACK),
        )
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const next = Math.min(historyIdx + 1, history.length - 1)
      setHistoryIdx(next)
      setDraft(history[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(historyIdx - 1, -1)
      setHistoryIdx(next)
      setDraft(next === -1 ? '' : history[next])
    }
  }

  return (
    <div
      className="flex h-full flex-col bg-v2-foreground/[0.02] font-mono text-[11px]"
      onClick={() => inputRef.current?.focus()}
    >
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {scrollback.length === 0 && (
          <p className="text-v2-muted">
            hyve@workbench · type{' '}
            <code className="rounded bg-v2-foreground/[0.06] px-1">help</code> to see commands.
          </p>
        )}
        {scrollback.map((entry, i) => (
          <div key={i}>
            <div className="text-v2-muted">
              $ <span className="text-v2-foreground">{entry.input}</span>
            </div>
            {entry.outputs.map((o, j) => (
              <OutputBlock key={j} block={o} />
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-1 border-t border-v2-border/60 px-3 py-1.5">
        <span className="text-v2-muted">$</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          aria-label="Terminal input"
          spellCheck={false}
          autoComplete="off"
          autoFocus
          className="flex-1 bg-transparent text-v2-foreground outline-none"
        />
      </div>
    </div>
  )
}

function OutputBlock({ block }: { block: CliOutputBlock }) {
  if (block.kind === 'text') {
    return <pre className="whitespace-pre-wrap text-v2-foreground">{block.lines.join('\n')}</pre>
  }
  if (block.kind === 'error') {
    return <pre className="text-v2-danger">{block.message}</pre>
  }
  return (
    <table className="text-[10.5px]">
      <thead>
        <tr>
          {block.headers.map((h) => (
            <th key={h} className="px-2 text-left text-v2-muted font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {block.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="px-2 text-v2-foreground">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
