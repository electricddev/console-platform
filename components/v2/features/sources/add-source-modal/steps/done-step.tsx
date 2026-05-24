'use client'

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { connectorById, WORDMARK_TONES } from '../../catalog-data'

type Props = {
  connectorId: string
  datasetCount: number
  onGoToConnection: () => void
  onAddAnother: () => void
  onDismiss: () => void
}

export function DoneStep({ connectorId, datasetCount, onGoToConnection, onAddAnother, onDismiss }: Props) {
  const def = connectorById(connectorId)

  useEffect(() => {
    const t = setTimeout(onDismiss, 6_000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div className="flex flex-col gap-5 px-1 pt-2">
      <div className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-v2-muted/70">
        Connected
      </div>

      <div className="flex items-start gap-4">
        {def?.logo.kind === 'wordmark' ? (
          <span
            aria-hidden="true"
            className={cn(
              'flex size-12 items-center justify-center rounded-md font-mono text-[14px] font-semibold',
              WORDMARK_TONES[def.logo.tone],
            )}
          >
            {def.logo.label}
          </span>
        ) : def?.logo.kind === 'icon' ? (
          <span className="flex size-12 items-center justify-center rounded-md bg-v2-surface-2">
            <def.logo.Icon className="size-6 text-v2-muted" strokeWidth={1.75} />
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-[26px] font-normal leading-[1.1] tracking-[-0.01em] text-v2-foreground">
            {def?.name ?? 'Source'} connected.
          </h2>
          <p className="mt-1.5 text-[13px] text-v2-muted">
            {datasetCount} dataset{datasetCount === 1 ? '' : 's'} · first sync in 2 minutes.
          </p>
        </div>

        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-v2-green-soft text-v2-green"
        >
          <Check className="size-4" strokeWidth={2.5} />
        </span>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onAddAnother}>Add another</Button>
        <Button size="sm" variant="brand" onClick={onGoToConnection}>
          Go to connection →
        </Button>
      </div>
    </div>
  )
}
