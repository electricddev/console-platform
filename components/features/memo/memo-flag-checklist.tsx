'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RedFlag, FlagDecision, FlagDecisionAction } from '@/lib/api/schemas'

type Props = {
  flags: RedFlag[]
  decisions: FlagDecision[]
  onDecide: (decision: Omit<FlagDecision, 'decidedAt' | 'decidedBy'>) => void
  readOnly: boolean
}

const sevTone: Record<RedFlag['severity'], string> = {
  low: 'border-foreground/20 bg-foreground/5',
  medium: 'border-warning/40 bg-warning/5',
  high: 'border-danger/40 bg-danger/5',
}

export function MemoFlagChecklist({ flags, decisions, onDecide, readOnly }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeAction, setActiveAction] = useState<FlagDecisionAction>('acknowledge')
  const [note, setNote] = useState('')

  function open(flagId: string, action: FlagDecisionAction) {
    setActiveId(flagId); setActiveAction(action); setNote('')
  }
  function save() {
    if (!activeId || note.trim().length === 0) return
    onDecide({ flagId: activeId, action: activeAction, note: note.trim() })
    setActiveId(null); setNote('')
  }

  return (
    <ul className="grid gap-2">
      {flags.map((f) => {
        const decision = decisions.find((d) => d.flagId === f.id)
        return (
          <li key={f.id} className={cn('rounded-md border-l-2 p-3', sevTone[f.severity])}>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-sm font-medium">{f.label}</p>
                <p className="text-xs text-muted-foreground">{f.reason}</p>
              </div>
              {decision && (
                <span className="rounded-sm bg-foreground/10 px-2 py-0.5 text-[0.65rem] font-tag uppercase">
                  {decision.action === 'acknowledge' ? 'Acknowledged' : decision.action === 'dismiss' ? 'Dismissed' : 'Mitigated'}
                </span>
              )}
            </div>
            {decision && <p className="mt-2 text-xs italic text-muted-foreground">&quot;{decision.note}&quot;</p>}
            {!decision && !readOnly && activeId !== f.id && (
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => open(f.id, 'acknowledge')}>Acknowledge</Button>
                <Button size="sm" variant="outline" onClick={() => open(f.id, 'dismiss')}>Dismiss</Button>
                <Button size="sm" variant="outline" onClick={() => open(f.id, 'mitigate')}>Mitigate</Button>
              </div>
            )}
            {activeId === f.id && !readOnly && (
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-xs">
                  <span>Note ({activeAction}):</span>
                  <textarea
                    aria-label="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="min-h-16 rounded-md border border-border bg-background p-2"
                  />
                </label>
                <div className="flex gap-2">
                  <Button size="sm" onClick={save}>Save decision</Button>
                  <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>Cancel</Button>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
