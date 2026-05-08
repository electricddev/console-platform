import Link from 'next/link'
import { fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AIInsight } from '@/lib/api/types'

const SEVERITY_LABEL = {
  info: 'notice',
  warning: 'anomaly',
  critical: 'critical',
} as const

const SEVERITY_TONE = {
  info: 'text-info',
  warning: 'text-warning',
  critical: 'text-destructive',
} as const

const SEVERITY_DOT = {
  info: 'bg-info',
  warning: 'bg-warning',
  critical: 'bg-destructive',
} as const

export function InsightRow({ insight }: { insight: AIInsight }) {
  const href = insight.suggestedAction?.href ?? '#'
  return (
    <Link
      href={href}
      className="group grid gap-2 border-t border-border/70 px-1 py-4 first:border-t-0 hover:bg-muted/30"
    >
      <div className="flex items-center gap-3">
        <span className={cn('size-1.5 rounded-full', SEVERITY_DOT[insight.severity])} aria-hidden />
        <span className={cn('font-tag', SEVERITY_TONE[insight.severity])}>
          {SEVERITY_LABEL[insight.severity]}
        </span>
        <span className="ml-auto font-mono text-[0.7rem] text-muted-foreground tabular-nums">
          {fmtRelativeTime(insight.generatedAt)}
        </span>
      </div>
      <p className="text-[0.95rem] leading-snug text-foreground/95 transition-colors group-hover:text-foreground">
        {insight.claim}
      </p>
    </Link>
  )
}
