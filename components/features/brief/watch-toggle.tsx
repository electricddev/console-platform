'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import type { NotificationChannelKind } from '@/lib/api/schemas'

type Props = {
  datasetId: string
  initialWatching: boolean
  initialChannels: NotificationChannelKind[]
  onWatch: (channels: NotificationChannelKind[]) => void
  onUnwatch: () => void
}

const ALL_CHANNELS: NotificationChannelKind[] = ['slack', 'email', 'webhook']

export function WatchToggle({ datasetId, initialWatching, initialChannels, onWatch, onUnwatch }: Props) {
  void datasetId
  const [open, setOpen] = useState(false)
  const [channels, setChannels] = useState<NotificationChannelKind[]>(initialChannels)
  const watching = initialWatching

  function toggleChannel(kind: NotificationChannelKind) {
    setChannels((cur) => cur.includes(kind) ? cur.filter((c) => c !== kind) : [...cur, kind])
  }

  function handleTrigger() {
    if (!watching) {
      onWatch(channels)
    } else {
      setOpen((o) => !o)
    }
  }

  return (
    <div className="relative inline-block">
      <Button size="sm" variant={watching ? 'default' : 'outline'} onClick={handleTrigger}>
        {watching ? `Watching${channels.length ? ` · ${channels.length}` : ''}` : 'Watch'}
      </Button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-64 rounded-md border border-border bg-surface p-3 shadow-lg">
          <p className="mb-2 font-tag text-xs text-foreground/60">{'// notification channels'}</p>
          <ul className="grid gap-1">
            {ALL_CHANNELS.map((c) => (
              <li key={c}>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} />
                  <span className="capitalize">{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={() => { onWatch(channels); setOpen(false) }}>{watching ? 'Update' : 'Watch'}</Button>
            {watching && <Button size="sm" variant="ghost" onClick={() => { onUnwatch(); setOpen(false) }}>Stop watching</Button>}
          </div>
        </div>
      )}
    </div>
  )
}
