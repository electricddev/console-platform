'use client'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { AnomalyEvent } from '@/lib/api/schemas'

type Filter = {
  kinds: AnomalyEvent['kind'][]
  severities: AnomalyEvent['severity'][]
}

const KINDS: AnomalyEvent['kind'][] = ['credit-event', 'filing', 'attestation-gap', 'amm-sla']
const SEVERITIES: AnomalyEvent['severity'][] = ['info', 'low', 'medium', 'high']

export function AlertFilterBar({ onChange }: { onChange: (f: Filter) => void }) {
  const [kinds, setKinds] = useState<AnomalyEvent['kind'][]>([])
  const [severities, setSeverities] = useState<AnomalyEvent['severity'][]>([])

  function toggleKind(k: AnomalyEvent['kind']) {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k]
    setKinds(next); onChange({ kinds: next, severities })
  }
  function toggleSev(s: AnomalyEvent['severity']) {
    const next = severities.includes(s) ? severities.filter((x) => x !== s) : [...severities, s]
    setSeverities(next); onChange({ kinds, severities: next })
  }

  return (
    <div className="flex flex-wrap gap-3 rounded-md border border-border bg-surface/30 p-3">
      <div className="flex flex-wrap gap-1">
        {KINDS.map((k) => (
          <button key={k} type="button" onClick={() => toggleKind(k)}
            className={cn('rounded-full border px-2 py-0.5 text-xs',
              kinds.includes(k) ? 'border-foreground bg-foreground text-background' : 'border-border')}>
            {k}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {SEVERITIES.map((s) => (
          <button key={s} type="button" onClick={() => toggleSev(s)}
            className={cn('rounded-full border px-2 py-0.5 text-xs capitalize',
              severities.includes(s) ? 'border-foreground bg-foreground text-background' : 'border-border')}>
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
