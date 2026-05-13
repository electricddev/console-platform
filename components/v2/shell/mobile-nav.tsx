'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Plug, Database, Scale, SlidersHorizontal } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import { cn } from '@/lib/utils'

type MobileNavItem = {
  href: string
  label: string
  icon: React.ComponentType<LucideProps>
  exact?: true
}

const items: MobileNavItem[] = [
  { href: '/v2', label: 'Overview', icon: Compass, exact: true },
  { href: '/v2/sources', label: 'Sources', icon: Plug },
  { href: '/v2/datasets', label: 'Datasets', icon: Database },
  { href: '/v2/rules', label: 'Rules', icon: Scale },
  { href: '/v2/settings', label: 'Settings', icon: SlidersHorizontal },
]

export function V2MobileNav() {
  const pathname = usePathname()
  return (
    <nav
      className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-v2-border bg-v2-surface/80 backdrop-blur-xl md:hidden"
      aria-label="Mobile navigation"
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-col items-center gap-0.5 px-4 py-2.5 text-[10px] transition-all',
              active ? 'font-medium text-v2-foreground' : 'text-v2-muted'
            )}
          >
            {active && (
              <span className="absolute top-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-v2-brand" />
            )}
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
