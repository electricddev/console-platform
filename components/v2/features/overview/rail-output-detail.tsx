'use client'

import type { PipelineNode } from './pipeline-types'

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailOutputDetail(_: Props) {
  return <div className="p-5 text-xs text-v2-muted">output detail (stub)</div>
}
