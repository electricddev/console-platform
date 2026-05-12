import Link from 'next/link'
import type { ReactNode } from 'react'
import type { RedFlag } from '@/lib/api/schemas'
import { cn } from '@/lib/utils'

const sevTone: Record<RedFlag['severity'], string> = {
  low: 'border-foreground/20 bg-foreground/5',
  medium: 'border-warning/40 bg-warning/5',
  high: 'border-danger/40 bg-danger/5',
}

export function RedFlagCard({ flag, actions }: { flag: RedFlag; actions?: ReactNode }) {
  return (
    <li className={cn('rounded-md border-l-2 p-3', sevTone[flag.severity])}>
      <p className="text-sm font-medium">
        {flag.drillHref ? (
          <Link href={flag.drillHref} className="hover:underline">{flag.label}</Link>
        ) : flag.label}
      </p>
      <p className="text-xs text-muted-foreground">{flag.reason}</p>
      {actions}
    </li>
  )
}
