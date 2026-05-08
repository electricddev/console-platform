import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  label: ReactNode
  value: ReactNode
  className?: string
}

export function KeyValue({ label, value, className }: Props) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="font-tag text-foreground/55">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  )
}
