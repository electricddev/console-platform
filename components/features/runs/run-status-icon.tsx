import {
  Clock,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  X,
  ShieldAlert,
} from 'lucide-react'
import type { RunStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type Props = {
  status: RunStatus
  className?: string
}

const CONFIG: Record<
  RunStatus,
  { icon: React.ElementType; colorClass: string; spin?: boolean }
> = {
  queued:    { icon: Clock,        colorClass: 'text-muted-foreground' },
  running:   { icon: Loader2,      colorClass: 'text-info',    spin: true },
  attesting: { icon: ShieldCheck,  colorClass: 'text-warning', spin: true },
  anchoring: { icon: ShieldCheck,  colorClass: 'text-warning', spin: true },
  completed: { icon: CheckCircle2, colorClass: 'text-success' },
  failed:    { icon: X,            colorClass: 'text-destructive' },
  disputed:  { icon: ShieldAlert,  colorClass: 'text-destructive' },
}

export function RunStatusIcon({ status, className }: Props) {
  const { icon: Icon, colorClass, spin } = CONFIG[status]
  return (
    <Icon
      aria-label={status}
      className={cn('size-3.5 shrink-0', colorClass, spin && 'animate-spin', className)}
    />
  )
}
