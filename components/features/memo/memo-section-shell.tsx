// components/features/memo/memo-section-shell.tsx
import type { ReactNode } from 'react'

export function MemoSectionShell({
  letter, name, prompt, children,
}: { letter: string; name: string; prompt: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface/40 p-5">
      <header className="mb-3 flex items-baseline gap-3">
        <span className="flex size-7 items-center justify-center rounded-md bg-foreground/10 font-mono text-sm font-semibold">{letter}</span>
        <h3 className="text-lg font-medium">{name}</h3>
        <p className="text-xs text-muted-foreground">{prompt}</p>
      </header>
      <div className="grid gap-3">{children}</div>
    </section>
  )
}
