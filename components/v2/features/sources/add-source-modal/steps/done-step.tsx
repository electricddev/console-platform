'use client'

import { useEffect } from 'react'
import { Check } from 'lucide-react'
import { connectorById } from '../../catalog-data'

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
    <div className="flex flex-col items-center gap-4 px-1 pt-4 text-center">
      <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-[oklch(0.60_0.12_150)]/12 text-[oklch(0.62_0.13_145)]">
        <Check className="size-6" strokeWidth={2.5} />
      </span>
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-v2-muted/65 mb-1">Connected</div>
        <h2 className="font-serif text-[26px] font-normal leading-[1.1] tracking-[-0.01em] text-v2-foreground mt-4">
          {def?.name ?? 'Source'} connected.
        </h2>
        <p className="mt-1 text-[13px] text-v2-muted">
          {datasetCount} dataset{datasetCount === 1 ? '' : 's'} · first sync in 2 minutes.
        </p>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onGoToConnection}
          className="rounded-md border border-v2-border px-5 py-2 text-[12.5px] text-v2-foreground hover:bg-v2-foreground/[0.04] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          Go to connection
        </button>
        <button
          type="button"
          onClick={onAddAnother}
          className="rounded-md bg-[oklch(0.40_0.10_160)] px-5 py-2 text-[12.5px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)] hover:shadow-[0_4px_18px_-8px_oklch(0.40_0.10_160_/_0.5)] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          Add another
        </button>
      </div>
    </div>
  )
}
