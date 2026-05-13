import type { ReactNode } from 'react'
import { V2ThemeProvider } from '@/components/v2/theme-provider'
import { V2Shell } from '@/components/v2/shell/v2-shell'
import './v2.css'

export default function V2Layout({ children }: { children: ReactNode }) {
  return (
    <V2ThemeProvider>
      <div data-v2 className="min-h-screen bg-v2-background text-v2-foreground">
        <V2Shell>{children}</V2Shell>
      </div>
    </V2ThemeProvider>
  )
}
