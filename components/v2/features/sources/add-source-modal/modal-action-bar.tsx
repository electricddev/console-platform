'use client'

import type { ReactNode } from 'react'

type Props = { left?: ReactNode; right?: ReactNode }

export function ModalActionBar({ left, right }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-v2-border/40 px-6 py-3.5">
      <div className="flex items-center gap-2">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  )
}
