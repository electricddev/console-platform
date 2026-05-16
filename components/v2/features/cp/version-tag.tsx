import { cn } from '@/lib/utils'

type VersionTone = 'executing' | 'proposed' | 'retired' | 'changes_requested' | 'denied' | 'draft'

type Props = {
  version: number
  tone: VersionTone
  className?: string
}

const TONE_CLASS: Record<VersionTone, string> = {
  executing:         'bg-v2-foreground/[0.1] text-v2-foreground',
  proposed:          'border border-v2-border text-v2-foreground bg-transparent',
  retired:           'text-v2-muted',
  changes_requested: 'bg-v2-warning/[0.12] text-v2-warning',
  denied:            'bg-v2-danger/[0.1] text-v2-danger/80',
  draft:             'text-v2-muted/60',
}

/**
 * VersionTag — version pill (v1, v2, etc.) with tone variants.
 * RSC-safe. Mono font, tabular.
 */
export function VersionTag({ version, tone, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-px font-mono text-[10.5px] tabular-nums font-medium tracking-tight',
        TONE_CLASS[tone],
        className,
      )}
    >
      v{version}
    </span>
  )
}

/** Map AnalysisVersion status to VersionTag tone */
export function versionTone(
  status: string,
): VersionTone {
  switch (status) {
    case 'executing':         return 'executing'
    case 'proposed':          return 'proposed'
    case 'retired':           return 'retired'
    case 'changes_requested': return 'changes_requested'
    case 'denied':            return 'denied'
    case 'draft':             return 'draft'
    default:                  return 'proposed'
  }
}

/** Map overall Analysis status to VersionTag tone */
export function analysisTone(status: string): VersionTone {
  switch (status) {
    case 'approved_executing': return 'executing'
    case 'proposed':           return 'proposed'
    case 'changes_requested':  return 'changes_requested'
    case 'denied':             return 'denied'
    case 'draft':              return 'draft'
    case 'retired':            return 'retired'
    default:                   return 'proposed'
  }
}
