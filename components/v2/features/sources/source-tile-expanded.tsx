'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from './catalog-data'
import { InspectorContent } from './inspector/inspector-content'
import { ActionsRow } from './inspector/actions-row'
import { removeConnection } from '@/app/(originator)/sources/actions'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

const STATUS_DOT: Record<ConnectorConnection['status'], string> = {
  ok: 'bg-[oklch(0.55_0.10_150)]',
  attention: 'bg-[oklch(0.70_0.14_70)]',
  error: 'bg-[oklch(0.55_0.18_25)]',
  paused: 'bg-v2-muted/60',
}

type Props =
  | {
      mode: 'inspect'
      connection: ConnectorConnection
      datasets: readonly ConnectionDataset[]
      onClose: () => void
      onReconnect?: () => void
    }
  | {
      mode: 'setup'
      connectorId: string
      onClose: () => void
      onDone: (connectionId: string) => void
    }

export function SourceTileExpanded(props: Props) {
  if (props.mode === 'inspect') {
    return <InspectMode {...props} />
  }
  return <SetupPlaceholder {...props} />
}

function InspectMode({
  connection,
  datasets,
  onClose,
  onReconnect,
}: Extract<Props, { mode: 'inspect' }>) {
  const def = connectorById(connection.connectorId)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-v2-foreground/30 bg-v2-surface p-4 shadow-xl shadow-black/[0.08]"
    >
      <header className="flex items-start justify-between gap-3 pb-3">
        <div className="flex items-center gap-2.5">
          {def?.logo.kind === 'wordmark' ? (
            <span
              aria-hidden="true"
              className={cn(
                'flex size-8 items-center justify-center rounded-md font-mono text-[11px] font-semibold',
                WORDMARK_TONES[def.logo.tone],
              )}
            >
              {def.logo.label}
            </span>
          ) : null}
          <div>
            <h2 className="text-[14px] font-semibold tracking-tight text-v2-foreground">{connection.name}</h2>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-v2-muted">
              <span aria-hidden="true" className={cn('size-1.5 rounded-full', STATUS_DOT[connection.status])} />
              <span>{connection.subtitle ?? def?.tagline}</span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close inspector"
          className="rounded-md p-1 text-v2-muted hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </header>

      {confirmingRemove ? (
        <RemoveConfirm
          connection={connection}
          onCancel={() => setConfirmingRemove(false)}
          onRemoved={onClose}
        />
      ) : (
        <>
          <InspectorContent connection={connection} datasets={datasets} />
          <ActionsRow
            connection={connection}
            onReconnect={onReconnect ?? (() => {})}
            onRequestRemove={() => setConfirmingRemove(true)}
          />
        </>
      )}
    </motion.div>
  )
}

function SetupPlaceholder({ connectorId, onClose }: Extract<Props, { mode: 'setup' }>) {
  const def = connectorById(connectorId)
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-v2-foreground/30 bg-v2-surface p-4 shadow-xl shadow-black/[0.08]"
    >
      <header className="flex items-start justify-between gap-3 pb-3">
        <div>
          <h2 className="text-[14px] font-semibold tracking-tight text-v2-foreground">Add {def?.name}</h2>
          <p className="mt-0.5 text-[10.5px] text-v2-muted">Setup is wired in Phase F.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cancel setup"
          className="rounded-md p-1 text-v2-muted hover:text-v2-foreground"
        >
          <X className="size-4" strokeWidth={1.75} />
        </button>
      </header>
    </motion.div>
  )
}

function RemoveConfirm({
  connection,
  onCancel,
  onRemoved,
}: {
  connection: ConnectorConnection
  onCancel: () => void
  onRemoved: () => void
}) {
  const [value, setValue] = useState('')
  const match = value.trim() === connection.name
  return (
    <div className="rounded-md border border-v2-border/80 bg-v2-surface-2/50 p-3">
      <p className="text-[12.5px] text-v2-foreground">Remove {connection.name}?</p>
      <p className="mt-1 text-[11px] text-v2-muted">
        Datasets and their bindings will be dropped. Type the connection name to confirm.
      </p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={connection.name}
        className="mt-2 w-full rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12px] text-v2-foreground placeholder:text-v2-muted/60 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
        aria-label="Connection name to confirm removal"
      />
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-v2-border px-2.5 py-1 text-[11.5px] text-v2-foreground hover:bg-v2-foreground/[0.04]"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!match}
          onClick={async () => {
            const result = await removeConnection(connection.id, value)
            if (result.ok) {
              toast.success('Removed')
              onRemoved()
            } else {
              toast.error(result.error)
            }
          }}
          className={cn(
            'rounded-md border px-2.5 py-1 text-[11.5px]',
            match
              ? 'border-[oklch(0.55_0.18_25)] bg-[oklch(0.55_0.18_25)] text-v2-background'
              : 'cursor-not-allowed border-v2-border text-v2-muted',
          )}
        >
          Remove
        </button>
      </div>
    </div>
  )
}
