'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CardAura } from './card-aura'
import { RailAttentionQueue } from './rail-attention-queue'
import { RailNodeDetail } from './rail-node-detail'
import { RailOutputDetail } from './rail-output-detail'
import type { ComputedAttentionItem } from './attention'
import type { PipelineNode } from './pipeline-types'

interface RailProps {
  selectedNode: PipelineNode | null
  attention: { items: ComputedAttentionItem[]; overflow: number }
  nextPublishAt: string
  attestedCount: number
  pendingCount: number
  failedCount: number
  onClearSelection: () => void
  onAttentionRowSelect: (nodeId: string) => void
  onHoverDimSet: (nodeIds: string[] | null) => void
}

export function Rail(props: RailProps) {
  const { selectedNode } = props

  // Decide which state to render. Output-node detail takes precedence.
  const state: 'A' | 'B' | 'C' =
    selectedNode === null
      ? 'A'
      : selectedNode.id === 'pub-attest'
        ? 'C'
        : 'B'

  return (
    <aside
      aria-label="Pipeline status panel"
      className="relative w-[320px] shrink-0 overflow-hidden rounded-2xl border border-v2-border/30 bg-v2-surface/40 backdrop-blur-[12px]"
    >
      <CardAura variant="warm" id="rail" blobX={20} blobY={92} />

      <div className="relative z-10 h-full">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'A' && (
            <motion.div
              key="A"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              <RailAttentionQueue
                attention={props.attention}
                nextPublishAt={props.nextPublishAt}
                attestedCount={props.attestedCount}
                pendingCount={props.pendingCount}
                failedCount={props.failedCount}
                onAttentionRowSelect={props.onAttentionRowSelect}
                onHoverDimSet={props.onHoverDimSet}
              />
            </motion.div>
          )}
          {state === 'B' && selectedNode && (
            <motion.div
              key={`B-${selectedNode.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              <RailNodeDetail node={selectedNode} onBack={props.onClearSelection} />
            </motion.div>
          )}
          {state === 'C' && selectedNode && (
            <motion.div
              key={`C-${selectedNode.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              <RailOutputDetail node={selectedNode} onBack={props.onClearSelection} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
