import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

export function MonoText({
  className,
  ...props
}: ComponentPropsWithoutRef<'span'>) {
  return (
    <span
      className={cn('font-mono text-[0.8125rem] tabular-nums', className)}
      {...props}
    />
  )
}
