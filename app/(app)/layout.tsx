import type { ReactNode } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
  // Auth wall + AppShell are added in Task 22.
  return <div className="min-h-screen bg-background text-foreground">{children}</div>
}
