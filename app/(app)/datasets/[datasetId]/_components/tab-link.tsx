'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  children: React.ReactNode
}

export function TabLink({ href, children }: Props) {
  const pathname = usePathname()
  // Match exact URL, including trailing-slash sensitivity
  const active = pathname === href
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground',
        'aria-[current=page]:border-foreground aria-[current=page]:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}
