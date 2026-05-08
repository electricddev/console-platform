import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AIInsight } from '@/lib/api/types'
import { CornerMarks } from './corner-marks'

const SEVERITY_LABEL = {
  info: 'Notice',
  warning: 'Anomaly',
  critical: 'Critical',
} as const

const SEVERITY_TONE = {
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-destructive',
} as const

const SEVERITY_RAIL = {
  info: 'bg-info',
  warning: 'bg-warning',
  critical: 'bg-destructive',
} as const

type Props = {
  insight: AIInsight
  className?: string
}

export function FeaturedInsight({ insight, className }: Props) {
  const tone = SEVERITY_TONE[insight.severity]
  const rail = SEVERITY_RAIL[insight.severity]

  return (
    <article
      className={cn(
        'relative overflow-hidden border border-border bg-surface',
        className,
      )}
    >
      <CornerMarks tone="subtle" inset={4} />
      <div
        aria-hidden
        className="pointer-events-none absolute right-0 top-0 z-0 h-[80px] w-[180px] bg-dot-fine mask-radial-tr"
      />
      <div className={cn('absolute inset-y-0 left-0 w-[3px]', rail)} aria-hidden />
      <div className="grid gap-6 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className={cn('font-tag', tone)}>{`// ${SEVERITY_LABEL[insight.severity].toLowerCase()}`}</span>
          <span className="font-tag text-foreground/45">flagged · ai copilot</span>
          <span className="ml-auto text-[0.7rem] text-muted-foreground">
            {fmtRelativeTime(insight.generatedAt)}
          </span>
        </div>

        <blockquote className="font-display text-2xl leading-[1.18] tracking-tight text-foreground md:text-[1.75rem]">
          <span aria-hidden className="float-left -mt-2 mr-2 font-display text-5xl italic text-foreground/20 leading-none md:text-6xl">
            “
          </span>
          {insight.claim}
        </blockquote>

        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span className="font-tag text-foreground/55">{'// evidence'}</span>
          {insight.evidenceRunIds.slice(0, 4).map((rid) => (
            <CopyableHash key={rid} value={rid} short className="text-[0.7rem]" />
          ))}
          {insight.suggestedAction && (
            <Link
              href={insight.suggestedAction.href}
              className={cn(
                'group ml-auto inline-flex items-center gap-1.5 self-end rounded-sm border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-all hover:bg-foreground hover:text-background active:translate-y-px',
              )}
            >
              {insight.suggestedAction.label}
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
