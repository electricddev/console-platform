'use client'

import { useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { InteractiveGrid } from '@/components/v2/interactive-grid'
import { CpSidebar } from './cp-sidebar'
import { CpMobileNav } from './cp-mobile-nav'

// Routes that get viewport-filling layout (no max-w, no padding wrapper)
const FULL_BLEED_PATTERNS: RegExp[] = [
  /^\/cp\/analyses\/new/,
]

export function CpShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const isFullBleed = FULL_BLEED_PATTERNS.some((p) => p.test(pathname))

  return (
    <div className="relative flex h-screen overflow-hidden bg-v2-background">
      <InteractiveGrid />

      <div className="hidden md:flex">
        <CpSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      </div>

      <main
        data-content
        className="relative z-10 flex-1 overflow-y-auto pb-14 md:pb-0"
      >
        {isFullBleed ? (
          children
        ) : (
          <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">{children}</div>
        )}
      </main>

      <CpMobileNav />
    </div>
  )
}
