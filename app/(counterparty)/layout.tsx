import type { ReactNode } from 'react'
import { V2ThemeProvider } from '@/components/v2/theme-provider'
import { CpShell } from '@/components/v2/shell/cp/cp-shell'
// Both shells share the same OKLCH token definitions — import from the
// originator route group rather than duplicating the CSS file.
import '../(originator)/v2.css'

export default function CounterpartyLayout({ children }: { children: ReactNode }) {
  return (
    <V2ThemeProvider>
      <div data-v2 className="min-h-screen bg-v2-background text-v2-foreground">
        <CpShell>{children}</CpShell>
      </div>
    </V2ThemeProvider>
  )
}
