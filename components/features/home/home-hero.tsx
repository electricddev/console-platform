import { fmtDate, fmtNumber } from '@/lib/format'
import { cn } from '@/lib/utils'
import { CommandPrompt } from './command-prompt'

type Suggestion = { id: string; label: string; href: string; tone?: 'accent' | 'neutral' }

type Props = {
  userName: string
  orgName: string
  newRuns: number
  newInsights: number
  /** ISO timestamp of the last activity that landed since user last signed in. */
  lastEventAt?: string | null
  /** Quick-action suggestions shown as chips beneath the command prompt. */
  suggestions?: Suggestion[]
  className?: string
}

export function HomeHero({
  userName,
  orgName,
  newRuns,
  newInsights,
  lastEventAt,
  suggestions,
  className,
}: Props) {
  const firstName = userName.split(' ')[0]
  const dateLabel = fmtDate(new Date(), { pattern: 'EEEE · d LLLL yyyy' })

  return (
    <header
      className={cn(
        'relative overflow-hidden border-b border-border bg-surface',
        className,
      )}
    >
      {/* Layered backgrounds — accent bloom + dot grid + grid patch. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] accent-halo opacity-80"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-dot-grid-dark opacity-30 dark:bg-dot-grid dark:opacity-25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 h-[140px] w-[260px] bg-grid-fine mask-radial-tl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 h-[160px] w-[300px] bg-dot-fine mask-radial-tr"
      />

      <div className="relative grid gap-8 px-6 py-10 md:px-10 md:py-12">
        {/* Top row — eyebrow + live status */}
        <div className="flex flex-wrap items-center gap-3 text-[0.7rem]">
          <p className="font-tag text-foreground/60">
            {`// ${dateLabel.toLowerCase()} · counterparty · ${orgName.toLowerCase()}`}
          </p>
          <span aria-hidden className="hidden h-3 w-px bg-border md:inline" />
          <span className="inline-flex items-center gap-1.5 font-medium tracking-[0.14em] text-success uppercase">
            <span className="relative inline-flex size-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-success/60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            Live · network nominal
          </span>
          {lastEventAt && (
            <>
              <span aria-hidden className="hidden h-3 w-px bg-border md:inline" />
              <span className="font-mono text-[0.7rem] tabular-nums text-muted-foreground">
                last event {fmtDate(lastEventAt, { pattern: 'HH:mm:ss' })}
              </span>
            </>
          )}
        </div>

        {/* Greeting — kept tight so the command prompt becomes the focal point */}
        <div className="grid gap-3">
          <h1 className="font-display text-[2.5rem] leading-[1.04] tracking-tight text-foreground md:text-[3.25rem] lg:text-[3.75rem]">
            Welcome back, <span className="italic text-foreground/90">{firstName}.</span>
          </h1>
          <p className="max-w-[58ch] text-[0.95rem] leading-relaxed text-muted-foreground">
            {newRuns > 0 || newInsights > 0 ? (
              <>
                <span className="font-medium text-foreground">{fmtNumber(newRuns)} runs</span> and{' '}
                <span className="font-medium text-foreground">{fmtNumber(newInsights)} insights</span>{' '}
                landed since you last signed in. Pick up where you left off, or ask the room.
              </>
            ) : (
              <>The room is quiet. Ask anything — the Copilot has full context on your watchlist.</>
            )}
          </p>
        </div>

        {/* Command prompt — the forward-looking focal point */}
        <CommandPrompt suggestions={suggestions} className="max-w-3xl" />
      </div>

      {/* Tick rule baseline */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-6 right-6 h-1.5 tick-rule-x mask-fade-x md:left-10 md:right-10"
      />
    </header>
  )
}
