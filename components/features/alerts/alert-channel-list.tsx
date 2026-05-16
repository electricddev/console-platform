'use client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { actionDeleteAlertChannel } from '@/app/(app)/legacy/alerts/actions'
import { AlertTestButton } from './alert-test-button'
import type { AlertChannel } from '@/lib/api/schemas'

export function AlertChannelList({ channels }: { channels: AlertChannel[] }) {
  const [pending, startTransition] = useTransition()
  return (
    <ul className="grid gap-2">
      {channels.length === 0 && <p className="text-sm text-muted-foreground">No channels yet.</p>}
      {channels.map((c) => (
        <li key={c.id} className="rounded-md border border-border bg-surface/30 p-3 text-sm">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">{c.label}</p>
            <div className="flex gap-2">
              <AlertTestButton channelId={c.id} />
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionDeleteAlertChannel(c.id) })}>Delete</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{c.kind} · {c.target}</p>
        </li>
      ))}
      {pending && <p className="sr-only">Updating…</p>}
    </ul>
  )
}
