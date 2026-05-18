'use client'
import { Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function lineDiff(a: string, b: string): { kind: 'same' | 'add' | 'del'; line: string }[] {
  const oldLines = a.split('\n')
  const newLines = b.split('\n')
  const out: { kind: 'same' | 'add' | 'del'; line: string }[] = []
  // Simple LCS-free diff: align by index, mark adds/dels for divergent lines.
  const max = Math.max(oldLines.length, newLines.length)
  for (let i = 0; i < max; i++) {
    const o = oldLines[i]
    const n = newLines[i]
    if (o === n) out.push({ kind: 'same', line: o ?? '' })
    else {
      if (o !== undefined) out.push({ kind: 'del', line: o })
      if (n !== undefined) out.push({ kind: 'add', line: n })
    }
  }
  return out
}

type Props = {
  currentCode: string
  proposedCode: string
  onApply: () => void
  onDiscard: () => void
}

export function AssistantDiffProposal({ currentCode, proposedCode, onApply, onDiscard }: Props) {
  const lines = lineDiff(currentCode, proposedCode)
  return (
    <div className="rounded-lg border border-v2-border/60 overflow-hidden">
      <div className="flex items-center justify-between border-b border-v2-border/60 bg-v2-foreground/[0.04] px-3 py-1.5">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-v2-muted">Proposed edit</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onApply}
            className="inline-flex items-center gap-1 rounded bg-v2-success/15 px-2 py-0.5 font-mono text-[10px] text-v2-success transition-colors hover:bg-v2-success/25"
          >
            <Check className="h-3 w-3" /> Apply
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center gap-1 rounded bg-v2-foreground/[0.05] px-2 py-0.5 font-mono text-[10px] text-v2-muted transition-colors hover:bg-v2-foreground/[0.08]"
          >
            <X className="h-3 w-3" /> Discard
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-[10.5px] leading-snug">
        {lines.map((l, i) => (
          <div
            key={i}
            className={cn(
              'whitespace-pre',
              l.kind === 'add' && 'bg-v2-success/[0.08] text-v2-foreground',
              l.kind === 'del' && 'bg-v2-danger/[0.08] text-v2-muted line-through',
              l.kind === 'same' && 'text-v2-muted',
            )}
          >
            {l.kind === 'add' ? '+ ' : l.kind === 'del' ? '- ' : '  '}
            {l.line}
          </div>
        ))}
      </pre>
    </div>
  )
}
