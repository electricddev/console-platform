'use client'

import type { PipelineNode } from './pipeline-types'

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailNodeDetail(_: Props) {
  return <div className="p-5 text-xs text-v2-muted">node detail (stub)</div>
}
