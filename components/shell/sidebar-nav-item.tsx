'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  href: string
  label: string
  icon: LucideIcon
  collapsed: boolean
  exact?: boolean
}

export function SidebarNavItem({ href, label, icon: Icon, collapsed, exact }: Props) {
  const pathname = usePathname()
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex h-9 items-center gap-2 rounded-md px-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span
        className={cn(
          'truncate transition-opacity',
          collapsed ? 'pointer-events-none w-0 opacity-0' : 'opacity-100'
        )}
      >
        {label}
      </span>
    </Link>
  )
}
