import type { ReactNode } from 'react'
import type { RedFlag } from '@/lib/api/schemas'
import { RedFlagCard } from './red-flag-card'

type Props = {
  flags: RedFlag[]
  totalRules: number
  renderActions?: (flag: RedFlag) => ReactNode
}

export function RedFlagScoreboard({ flags, totalRules, renderActions }: Props) {
  return (
    <section aria-labelledby="red-flags">
      <header className="flex items-baseline justify-between">
        <h3 id="red-flags" className="font-tag text-foreground/60">{'// red flag scoreboard'}</h3>
        <span className="text-xs text-muted-foreground">{flags.length} of {totalRules} tripped</span>
      </header>
      {flags.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No red flags tripped against the current snapshot.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {flags.map((f) => <RedFlagCard key={f.id} flag={f} actions={renderActions?.(f)} />)}
        </ul>
      )}
    </section>
  )
}
