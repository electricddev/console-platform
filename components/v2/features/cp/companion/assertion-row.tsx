'use client'
import { useState } from 'react'
import { Play, Copy, Trash2, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Assertion, AssertionOperator } from './use-assertions'

const OPERATOR_LABELS: Record<AssertionOperator, string> = {
  not_null: 'not_null',
  unique: 'unique',
  range: 'range',
  between: 'between',
  eq: '=',
  regex: 'regex',
  freshness: 'freshness',
}

const OPERATORS = Object.keys(OPERATOR_LABELS) as AssertionOperator[]

type Props = {
  assertion: Assertion
  columns: string[]
  onUpdate: (id: string, patch: Partial<Assertion>) => void
  onRemove: (id: string) => void
  onDuplicate: (id: string) => void
  onRunOne: (id: string) => void
}

export function AssertionRow({ assertion: a, columns, onUpdate, onRemove, onDuplicate, onRunOne }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const showValue = a.operator !== 'not_null' && a.operator !== 'unique'
  const showSecondValue = a.operator === 'between' || a.operator === 'range'

  return (
    <li
      role="listitem"
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2',
        a.status === 'failed' ? 'border-v2-danger/40 bg-v2-danger/[0.04]' :
        a.status === 'passed' ? 'border-v2-border/60 bg-v2-foreground/[0.02]' :
        'border-v2-border/60 bg-v2-foreground/[0.04]',
      )}
    >
      <select
        aria-label="Column"
        value={a.column}
        onChange={(e) => onUpdate(a.id, { column: e.target.value, status: 'will-run' })}
        className="rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground"
      >
        {columns.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      <select
        aria-label="Operator"
        value={a.operator}
        onChange={(e) => onUpdate(a.id, { operator: e.target.value as AssertionOperator, status: 'will-run' })}
        className="rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground"
      >
        {OPERATORS.map((op) => <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>)}
      </select>

      {showValue && (
        <input
          aria-label="Value"
          type="text"
          value={a.value ?? ''}
          onChange={(e) => onUpdate(a.id, { value: e.target.value, status: 'will-run' })}
          placeholder="value"
          className="w-24 rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground placeholder:text-v2-muted/60"
        />
      )}

      {showSecondValue && (
        <>
          <span className="font-mono text-[10.5px] text-v2-muted">and</span>
          <input
            aria-label="Second value"
            type="text"
            value={a.value2 ?? ''}
            onChange={(e) => onUpdate(a.id, { value2: e.target.value, status: 'will-run' })}
            placeholder="value"
            className="w-24 rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground placeholder:text-v2-muted/60"
          />
        </>
      )}

      <div className="ml-auto flex items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 font-mono text-[9.5px]',
            a.status === 'will-run' && 'bg-v2-foreground/[0.06] text-v2-muted',
            a.status === 'passed' && 'bg-v2-success/10 text-v2-success',
            a.status === 'failed' && 'bg-v2-danger/10 text-v2-danger',
          )}
        >
          {a.status === 'will-run' ? 'Will run' : a.status === 'passed' ? 'Passed' : 'Failed'}
        </span>

        <button
          type="button"
          onClick={() => onRunOne(a.id)}
          aria-label="Run this assertion"
          className="rounded p-1 text-v2-muted transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
        >
          <Play className="h-3 w-3" strokeWidth={2} />
        </button>

        <div className="relative">
          <button
            type="button"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded p-1 text-v2-muted transition-colors hover:bg-v2-foreground/[0.06] hover:text-v2-foreground"
          >
            <MoreHorizontal className="h-3 w-3" strokeWidth={2} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-10 mt-1 w-32 rounded-md border border-v2-border bg-v2-surface py-1 shadow-md"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => { onDuplicate(a.id); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-2 py-1 text-left font-mono text-[10.5px] text-v2-foreground hover:bg-v2-foreground/[0.06]"
              >
                <Copy className="h-3 w-3" strokeWidth={1.75} /> Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { onRemove(a.id); setMenuOpen(false) }}
                className="flex w-full items-center gap-2 px-2 py-1 text-left font-mono text-[10.5px] text-v2-danger hover:bg-v2-danger/10"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.75} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {a.note && (
        <p className="basis-full pt-1 font-mono text-[9.5px] text-v2-danger">{a.note}</p>
      )}
    </li>
  )
}
