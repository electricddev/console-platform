'use client'

import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { connectorById } from '../../catalog-data'
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

  // Parse datasets from the trust.reads if available
  const datasetNames = (() => {
    if (!def?.trust) return null
    const reads = def.trust.reads
    const [itemsPart] = reads.split('·')
    if (!itemsPart) return null
    return itemsPart
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 6)
  })()

  // Qualifier (scope/cadence)
  const qualifierPart = (() => {
    if (!def?.trust) return null
    const [, ...parts] = def.trust.reads.split('·')
    return parts.map((s) => s.trim()).join(' · ') || null
  })()

  return (
    <>
      {/* Stage */}
      <div className="flex-1 px-7 pt-7 pb-4">
        {/* Sub copy — header already shows "[Provider] is connected." */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.08 }}
          className="text-[14px] text-v2-muted"
        >
          {datasetCount} dataset{datasetCount === 1 ? '' : 's'} are syncing. First sync in 2 minutes.
        </motion.p>

        {/* Data sheet — what was connected */}
        {(datasetNames || qualifierPart) && (
          <motion.dl
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.18 }}
            className="mt-6"
          >
            {datasetNames && (
              <div className="grid grid-cols-[100px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
                  Datasets
                </dt>
                <dd className="font-mono text-[11.5px] text-v2-foreground/85 leading-[1.55]">
                  {datasetNames.join(', ')}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-[100px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
              <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
                Cadence
              </dt>
              <dd className="font-mono text-[11.5px] text-v2-foreground/85 leading-[1.55]">
                Every 5 minutes
              </dd>
            </div>
            {qualifierPart && (
              <div className="grid grid-cols-[100px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
                <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
                  Scope
                </dt>
                <dd className="font-mono text-[11.5px] text-v2-foreground/85 leading-[1.55]">
                  {qualifierPart}
                </dd>
              </div>
            )}
          </motion.dl>
        )}
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
