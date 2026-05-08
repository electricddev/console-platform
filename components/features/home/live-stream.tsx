import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  Database,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtRelativeTime } from '@/lib/format'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StreamEventKind =
  | 'run-started'
  | 'run-completed'
  | 'run-failed'
  | 'attestation'
  | 'anchored'
  | 'anomaly'
  | 'query-shared'
  | 'completeness-restored'

export type StreamEvent = {
  id: string
  kind: StreamEventKind
  /** Short human title, e.g. "Default rate by vintage completed" */
  title: string
  /** One-line subtitle, e.g. "on ds_creditbridge · 1.8s · attested" */
  subtitle?: string
  /** Optional href the row links to. */
  href?: string
  /** ISO timestamp. */
  timestamp: string
  /** When true, render with shimmer + accent ring as the "newest" entry. */
  highlight?: boolean
}

type Props = {
  events: StreamEvent[]
  className?: string
  /** Title shown in the header. Default: "Live activity". */
  title?: string
  /** Optional href for the "view all" link in the header. */
  viewAllHref?: string
}

// ---------------------------------------------------------------------------
// Status dot — colour + optional pulse mapped per kind
// ---------------------------------------------------------------------------

const DOT_CLASS: Record<StreamEventKind, string> = {
  'run-started':           'bg-info pulse-soft',
  'run-completed':         'bg-success',
  'run-failed':            'bg-destructive',
  'attestation':           'bg-success',
  'anchored':              'bg-success',
  'anomaly':               'bg-warning pulse-soft',
  'query-shared':          'bg-accent',
  'completeness-restored': 'bg-success',
}

// ---------------------------------------------------------------------------
// Icon — component + colour class mapped per kind
// ---------------------------------------------------------------------------

type IconEntry = {
  Icon: typeof Zap
  colorClass: string
}

const ICON_MAP: Record<StreamEventKind, IconEntry> = {
  'run-started':           { Icon: Zap,           colorClass: 'text-info' },
  'run-completed':         { Icon: Zap,           colorClass: 'text-success' },
  'run-failed':            { Icon: Zap,           colorClass: 'text-destructive' },
  'attestation':           { Icon: ShieldCheck,   colorClass: 'text-success' },
  'anchored':              { Icon: ShieldCheck,   colorClass: 'text-success' },
  'anomaly':               { Icon: AlertTriangle, colorClass: 'text-warning' },
  'query-shared':          { Icon: Database,      colorClass: 'text-accent' },
  'completeness-restored': { Icon: Activity,      colorClass: 'text-success' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LiveStream({
  events,
  className,
  title = 'Live activity',
  viewAllHref,
}: Props) {
  return (
    <section aria-labelledby="live-stream" className={cn('grid', className)}>
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex items-baseline justify-between border-b border-border pb-3">
        <h3
          id="live-stream"
          className="font-display text-xl tracking-tight"
        >
          {title}
        </h3>

        <div className="flex items-center gap-4">
          {/* Live status badge */}
          <span
            className="flex items-center gap-1.5 font-tag text-foreground/55"
            aria-label="Streaming, last 24 hours"
          >
            <span
              aria-hidden
              className={cn(
                'size-1.5 rounded-full bg-success pulse-soft',
              )}
            />
            streaming · last 24h
          </span>

          {/* View all link */}
          {viewAllHref && (
            <Link
              href={viewAllHref}
              className="font-tag text-foreground/55 transition-colors hover:text-foreground"
            >
              {'// view all →'}
            </Link>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Empty state                                                         */}
      {/* ------------------------------------------------------------------ */}
      {events.length === 0 ? (
        <div className="flex flex-col items-start justify-center gap-2 py-10">
          <p className="font-display text-lg italic text-foreground/70">
            The room is quiet.
          </p>
          <p className="text-xs text-muted-foreground">
            No activity in the last 24 hours — new events will appear here as
            they stream in.
          </p>
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* Feed list                                                         */
        /* ---------------------------------------------------------------- */
        <ol className="grid">
          {events.map((event, i) => {
            const isLast = i === events.length - 1
            const dotClass = DOT_CLASS[event.kind]
            const { Icon, colorClass } = ICON_MAP[event.kind]

            const rowBase = cn(
              'group grid grid-cols-[1.25rem_1.5rem_1fr_auto] items-start gap-3 py-3 transition-colors',
              !isLast && 'border-b border-border/70',
              event.highlight
                ? [
                    'border-l-2 border-accent/60 pl-3',
                    'surface-glass ring-accent-soft shimmer',
                    'hover:bg-accent/10',
                  ]
                : 'hover:bg-muted/30',
            )

            const content = (
              <>
                {/* Status dot */}
                <span
                  aria-hidden
                  className={cn(
                    'mt-[0.3rem] size-2 rounded-full justify-self-center',
                    dotClass,
                  )}
                />

                {/* Icon */}
                <span aria-hidden className="mt-[0.1rem] flex items-start">
                  <Icon
                    size={14}
                    strokeWidth={1.75}
                    className={cn('shrink-0', colorClass)}
                  />
                </span>

                {/* Title + subtitle */}
                <div className="grid min-w-0 gap-0.5">
                  <p className="truncate text-[0.9rem] leading-snug text-foreground">
                    {event.title}
                  </p>
                  {event.subtitle && (
                    <p className="truncate font-mono text-[0.72rem] text-muted-foreground">
                      {event.subtitle}
                    </p>
                  )}
                </div>

                {/* Timestamp */}
                <time
                  dateTime={event.timestamp}
                  className="mt-[0.1rem] whitespace-nowrap font-mono text-[0.7rem] tabular-nums text-muted-foreground"
                >
                  {fmtRelativeTime(event.timestamp)}
                </time>
              </>
            )

            return (
              <li
                key={event.id}
                className="stream-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {event.href ? (
                  <Link href={event.href} className={rowBase}>
                    {content}
                  </Link>
                ) : (
                  <div className={rowBase}>{content}</div>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
