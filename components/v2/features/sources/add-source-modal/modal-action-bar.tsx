'use client'

import type { ReactNode } from 'react'

type Props = { left?: ReactNode; right?: ReactNode; stepIndicator?: string }

export function ModalActionBar({ left, right, stepIndicator }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-v2-border/40 px-7 py-4 shrink-0">
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-3">
        {stepIndicator && (
          <span className="font-mono text-[10.5px] text-v2-muted/60">{stepIndicator}</span>
        )}
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </div>
  )
}
