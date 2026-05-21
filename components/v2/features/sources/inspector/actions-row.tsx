'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ConnectorConnection } from '@/lib/api/schemas'
import { pauseConnection, resumeConnection } from '@/app/(originator)/sources/actions'

type Props = {
  connection: ConnectorConnection
  onReconnect: () => void
  onRequestRemove: () => void
}

export function ActionsRow({ connection, onReconnect, onRequestRemove }: Props) {
  const [pending, startTransition] = useTransition()
  const paused = connection.status === 'paused'

  function togglePause() {
    startTransition(async () => {
      const action = paused ? resumeConnection : pauseConnection
      const result = await action(connection.id)
      if (result.ok) {
        toast.success(paused ? 'Resumed' : 'Paused')
      } else {
        toast.error(result.error)
      }
    })
  }

  return (
    <div className="flex gap-2 pt-1">
      <Btn onClick={togglePause} disabled={pending}>{paused ? 'Resume' : 'Pause'}</Btn>
      <Btn onClick={onReconnect}>Reconnect</Btn>
      <Btn onClick={onRequestRemove} tone="danger">Remove</Btn>
    </div>
  )
}

function Btn({
  children,
  onClick,
  disabled,
  tone,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  tone?: 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md border px-2.5 py-1 text-[11.5px] transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground',
        tone === 'danger'
          ? 'border-v2-border text-[oklch(0.55_0.18_25)] hover:bg-[oklch(0.55_0.18_25)]/[0.06]'
          : 'border-v2-border text-v2-foreground hover:bg-v2-foreground/[0.04]',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  )
}
