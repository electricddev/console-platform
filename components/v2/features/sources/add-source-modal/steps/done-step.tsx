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
      <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-[oklch(0.55_0.10_150)]/15 text-[oklch(0.40_0.10_150)]">
        <Check className="size-5" strokeWidth={2.5} />
      </span>
      <div>
        <h2 className="font-serif text-[22px] font-normal leading-tight tracking-tight text-v2-foreground">
          {def?.name ?? 'Source'} connected.
        </h2>
        <p className="mt-1 text-[12.5px] text-v2-muted">
          {datasetCount} dataset{datasetCount === 1 ? '' : 's'} · first sync in 2 minutes.
        </p>
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={onGoToConnection} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-foreground hover:bg-v2-foreground/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground">
          Go to connection
        </button>
        <button type="button" onClick={onAddAnother} className="rounded-md bg-[oklch(0.40_0.10_160)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground">
          Add another
        </button>
      </div>
    </div>
  )
}
