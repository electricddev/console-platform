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
      {/* Stage — left-aligned celebration */}
      <div className="flex-1 px-7 pt-9 pb-4">
        {/* Logo + check row — both left-aligned */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-4"
        >
          {def?.logo.kind === 'wordmark' ? (
            <span
              aria-hidden="true"
              className={cn(
                'inline-flex size-14 items-center justify-center rounded-xl font-mono text-[14px] font-semibold shrink-0',
                WORDMARK_TONES[def.logo.tone],
              )}
            >
              {def.logo.label}
            </span>
          ) : def?.logo.kind === 'icon' ? (
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-v2-surface-2">
              <def.logo.Icon className="size-6 text-v2-muted" strokeWidth={1.75} />
            </span>
          ) : null}

          {/* Check icon */}
          <span className="flex size-7 items-center justify-center rounded-full bg-v2-green-soft text-v2-green shrink-0">
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
        </motion.div>

        {/* Headline — big, left-aligned */}
        <motion.h2
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mt-6 font-serif text-[36px] font-normal leading-[1.02] tracking-[-0.015em] text-v2-foreground"
        >
          {def?.name ?? 'Source'} is connected.
        </motion.h2>

        {/* Sub copy */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.18 }}
          className="mt-2 text-[14px] text-v2-muted"
        >
          {datasetCount} dataset{datasetCount === 1 ? '' : 's'} are syncing. First sync in 2 minutes.
        </motion.p>

        {/* Data sheet — what was connected */}
        {(datasetNames || qualifierPart) && (
          <motion.dl
            initial={shouldReduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, delay: 0.26 }}
            className="mt-7"
          >
            {datasetNames && (
              <div className="grid grid-cols-[100px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
                <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
                  Datasets
                </dt>
                <dd className="font-mono text-[12px] text-v2-foreground/90 leading-[1.55]">
                  {datasetNames.join(', ')}
                </dd>
              </div>
            )}
            <div className="grid grid-cols-[100px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
              <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
                Cadence
              </dt>
              <dd className="font-mono text-[12px] text-v2-foreground/90 leading-[1.55]">
                Every 5 minutes
              </dd>
            </div>
            {qualifierPart && (
              <div className="grid grid-cols-[100px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
                <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
                  Scope
                </dt>
                <dd className="font-mono text-[12px] text-v2-foreground/90 leading-[1.55]">
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
