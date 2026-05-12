import Link from 'next/link'
import type { RedFlag } from '@/lib/api/schemas'
import { cn } from '@/lib/utils'

const sevTone: Record<RedFlag['severity'], string> = {
  low:    'border-foreground/20 bg-foreground/5',
  medium: 'border-warning/40 bg-warning/5',
  high:   'border-danger/40 bg-danger/5',
}

export function RedFlagScoreboard({ flags, totalRules }: { flags: RedFlag[]; totalRules: number }) {
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
          {flags.map((f) => (
            <li key={f.id} className={cn('rounded-md border-l-2 p-3', sevTone[f.severity])}>
              <p className="text-sm font-medium">
                {f.drillHref ? (
                  <Link href={f.drillHref} className="hover:underline">{f.label}</Link>
                ) : (
                  f.label
                )}
              </p>
              <p className="text-xs text-muted-foreground">{f.reason}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
