'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { InteractiveGrid } from '@/components/v2/interactive-grid'
import { cn } from '@/lib/utils'
import { V2Sidebar } from './sidebar'
import { V2MobileNav } from './mobile-nav'

const FULL_WIDTH_PREFIXES: string[] = []
// Routes that take the full height of the main area (no inner scroll, no
// max-w cap) — typically pages that own their own viewport, like the live
// pipeline graph on /v2.
const FULL_BLEED_EXACT: string[] = ['/v2']

export function V2Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const isFullWidth = FULL_WIDTH_PREFIXES.some((p) => pathname.startsWith(p))
  const isFullBleed = FULL_BLEED_EXACT.includes(pathname)

  return (
    <div className="relative flex h-screen overflow-hidden bg-v2-background">
      <InteractiveGrid />

      <div className="hidden md:flex">
        <V2Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <main
        data-content
        className={cn(
          'relative z-10 flex-1 pb-14 md:pb-0',
          isFullBleed ? 'overflow-hidden' : 'overflow-y-auto'
        )}
      >
        {isFullBleed ? (
          <div className="h-full px-6 py-5 md:px-8 md:py-6">{children}</div>
        ) : isFullWidth ? (
          children
        ) : (
          <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">{children}</div>
        )}
      </main>

      <V2MobileNav />
    </div>
  )
}
