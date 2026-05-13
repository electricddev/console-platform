'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { InteractiveGrid } from '@/components/v2/interactive-grid'
import { V2Sidebar } from './sidebar'
import { V2MobileNav } from './mobile-nav'

const FULL_WIDTH_PREFIXES: string[] = []

export function V2Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const isFullWidth = FULL_WIDTH_PREFIXES.some((p) => pathname.startsWith(p))

  return (
    <div className="relative flex h-screen overflow-hidden bg-v2-background">
      <InteractiveGrid />

      <div className="hidden md:flex">
        <V2Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <main data-content className="relative z-10 flex-1 overflow-y-auto pb-14 md:pb-0">
        {isFullWidth ? (
          children
        ) : (
          <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">{children}</div>
        )}
      </main>

      <V2MobileNav />
    </div>
  )
}
