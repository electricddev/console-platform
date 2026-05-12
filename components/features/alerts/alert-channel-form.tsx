'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { actionCreateAlertChannel } from '@/app/(app)/alerts/actions'
import { useTransition } from 'react'
import type { NotificationChannelKind } from '@/lib/api/schemas'

export function AlertChannelForm() {
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState<NotificationChannelKind>('slack')
  const [label, setLabel] = useState('')
  const [target, setTarget] = useState('')

  function submit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await actionCreateAlertChannel({ kind, label, target })
      setLabel(''); setTarget('')
    })
  }

  return (
    <form className="grid gap-3 rounded-md border border-border bg-surface p-4" onSubmit={submit}>
      <div className="grid grid-cols-3 gap-2">
        <label className="grid gap-1 text-xs"><span>Kind</span>
          <select value={kind} onChange={(e) => setKind(e.target.value as NotificationChannelKind)} className="rounded border border-border bg-background p-2 text-sm">
            <option value="slack">Slack</option><option value="email">Email</option><option value="webhook">Webhook</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs"><span>Label</span>
          <input value={label} onChange={(e) => setLabel(e.target.value)} required className="rounded border border-border bg-background p-2 text-sm" />
        </label>
        <label className="grid gap-1 text-xs"><span>Target ({kind === 'email' ? 'address' : 'URL'})</span>
          <input value={target} onChange={(e) => setTarget(e.target.value)} required className="rounded border border-border bg-background p-2 text-sm" />
        </label>
      </div>
      <Button type="submit" disabled={pending}>Add channel</Button>
    </form>
  )
}
