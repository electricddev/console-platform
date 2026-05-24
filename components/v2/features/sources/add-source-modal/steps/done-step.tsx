'use client'

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { connectorById, WORDMARK_TONES } from '../../catalog-data'
import { ModalActionBar } from '../modal-action-bar'

type Props = {
  connectorId: string
  datasetCount: number
  onGoToConnection: () => void
  onAddAnother: () => void
  onDismiss: () => void
}

export function DoneStep({
  connectorId,
  datasetCount,
  onGoToConnection,
  onAddAnother,
  onDismiss,
}: Props) {
  const def = connectorById(connectorId)
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    const t = setTimeout(onDismiss, 6_000)
    return () => clearTimeout(t)
  }, [onDismiss])

  // Parse datasets from the trust.reads if available; otherwise fall back to generic
  const datasetNames = (() => {
    if (!def?.trust) return null
    const reads = def.trust.reads
    const [itemsPart] = reads.split('·')
    if (!itemsPart) return null
    return itemsPart
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6) // cap at 6 for display
  })()

  return (
    <>
      {/* Stage */}
      <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center">
        {/* Eyebrow */}
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-v2-muted/60 mb-5">
          Connection complete
        </div>

        {/* Check mark with glow */}
        <div className="relative flex items-center justify-center">
          {/* Radial glow behind the circle */}
          <div
            aria-hidden="true"
            className="absolute size-24 rounded-full bg-v2-green/15 blur-2xl"
          />
          <motion.div
            initial={shouldReduceMotion ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex size-14 items-center justify-center rounded-full bg-v2-green-soft text-v2-green"
          >
            <Check className="size-7" strokeWidth={2.5} />
          </motion.div>
        </div>

        {/* Headline */}
        <motion.h2
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.12 }}
          className="mt-4 font-serif text-[28px] tracking-tight leading-[1.05] text-v2-foreground"
        >
          {def?.name ?? 'Source'} connected.
        </motion.h2>

        {/* Sub */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.2 }}
          className="mt-1.5 text-[13px] text-v2-muted"
        >
          {datasetCount} dataset{datasetCount === 1 ? '' : 's'} are syncing. First
          sync starts in 2 minutes.
        </motion.p>

        {/* Dataset name list */}
        {datasetNames && datasetNames.length > 0 ? (
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.3 }}
            className="mt-6 font-mono text-[11.5px] text-v2-muted"
          >
            {datasetNames.join(', ')}
          </motion.div>
        ) : null}
      </div>

      {/* Action bar */}
      <ModalActionBar
        left={
          <Button variant="outline" size="sm" onClick={onAddAnother}>
            Add another
          </Button>
        }
        right={
          <Button size="sm" variant="brand" onClick={onGoToConnection}>
            Go to connection →
          </Button>
        }
      />
    </>
  )
}
