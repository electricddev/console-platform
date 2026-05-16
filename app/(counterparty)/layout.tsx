import type { ReactNode } from 'react'

// TODO: counterparty shell is a follow-up task
export default function CounterpartyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
