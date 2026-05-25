'use client'

import type { ReactNode } from 'react'

type Props = { left?: ReactNode; right?: ReactNode }

export function ModalActionBar({ left, right }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-v2-border/40 bg-v2-foreground/[0.015] dark:bg-white/[0.02] px-7 py-4 shrink-0">
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  )
}
