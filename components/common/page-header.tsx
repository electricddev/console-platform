import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: Props) {
  return (
    <header className={cn('flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6', className)}>
      <div className="flex flex-col gap-1.5">
        {eyebrow && <p className="font-tag text-foreground/60">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground max-w-prose">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}
