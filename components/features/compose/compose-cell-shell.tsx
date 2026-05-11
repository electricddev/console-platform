'use client'

import { Button } from '@/components/ui/button'

type Props = {
  title: string
  subtitle?: string
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
  children: React.ReactNode
}

export function ComposeCellShell({ title, subtitle, onMoveUp, onMoveDown, onRemove, children }: Props) {
  return (
    <div className="grid gap-2 rounded-lg border border-border bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-medium">{title}</div>
          {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onMoveUp} aria-label="Move up">↑</Button>
          <Button size="sm" variant="ghost" onClick={onMoveDown} aria-label="Move down">↓</Button>
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label="Remove cell">×</Button>
        </div>
      </div>
      {children}
    </div>
  )
}
