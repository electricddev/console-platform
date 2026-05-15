'use client'

import { cn } from '@/lib/utils'

/**
 * StatusPill — small floating chip used to label status on cards.
 * Replaces the "dot + label" pattern with a single hmm-style pill. The
 * background and text are tone-encoded; no inline dot. For ambient
 * metadata (timestamps, etc.) pair this with adjacent muted text.
 */
export type StatusTone =
  | 'success'
  | 'info'
  | 'warning'
  | 'danger'
  | 'neutral'

const TONE_CLASS: Record<StatusTone, string> = {
  success: 'bg-v2-success/[0.12] text-v2-success',
  info: 'bg-v2-info/[0.14] text-v2-info',
  warning: 'bg-v2-warning/[0.14] text-v2-warning',
  danger: 'bg-v2-danger/[0.14] text-v2-danger',
  neutral: 'bg-v2-foreground/[0.08] text-v2-foreground/80',
}

interface Props {
  tone: StatusTone
  children: React.ReactNode
  size?: 'xs' | 'sm'
  className?: string
}

export function StatusPill({ tone, children, size = 'sm', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium tracking-tight',
        TONE_CLASS[tone],
        size === 'xs'
          ? 'px-1.5 py-[1px] text-[10px]'
          : 'px-2 py-0.5 text-[11px]',
        className
      )}
    >
      {children}
    </span>
  )
}
