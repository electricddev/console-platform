'use client'

import type { ComputedAttentionItem } from './attention'

interface Props {
  attention: { items: ComputedAttentionItem[]; overflow: number }
  nextPublishAt: string
  attestedCount: number
  pendingCount: number
  failedCount: number
  onAttentionRowSelect: (nodeId: string) => void
  onHoverDimSet: (nodeIds: string[] | null) => void
}

export function RailAttentionQueue(_: Props) {
  return <div className="p-5 text-xs text-v2-muted">attention queue (stub)</div>
}
