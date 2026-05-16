'use client'

import { useState, type ReactNode } from 'react'
import { InteractiveGrid } from '@/components/v2/interactive-grid'
import { CpSidebar } from './cp-sidebar'
import { CpMobileNav } from './cp-mobile-nav'

// No full-bleed routes in the counterparty surface yet.
// Add patterns here if a route ever needs viewport-filling layout.
const FULL_BLEED_PATTERNS: RegExp[] = []

export function CpShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

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
        <div className="mx-auto max-w-5xl px-4 py-4 md:px-6 md:py-6">{children}</div>
      </main>

      <CpMobileNav />
    </div>
  )
}
