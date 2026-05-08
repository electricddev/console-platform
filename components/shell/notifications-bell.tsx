'use client'

import { useEffect, useState, useTransition } from 'react'
import { Bell, BellDot, Check } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Notification } from '@/lib/api/types'
import { subscribe, Topics } from '@/lib/api/realtime'

type Props = {
  initial: Notification[]
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

export function NotificationsBell({ initial, onMarkRead, onMarkAllRead }: Props) {
  const [items, setItems] = useState(initial)
  const [, startTransition] = useTransition()

  useEffect(
    () =>
      subscribe<Notification>(Topics.NOTIFICATIONS, (n) =>
        setItems((prev) => [n, ...prev])
      ),
    []
  )

  const unread = items.filter((n) => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Notifications (${unread} unread)`}>
          {unread > 0 ? <BellDot className="size-4" /> : <Bell className="size-4" />}
          {unread > 0 && (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 rounded-full bg-accent text-[0.625rem] text-accent-foreground">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <header className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          <Button
            variant="ghost"
            size="xs"
            onClick={() =>
              startTransition(async () => {
                await onMarkAllRead()
                setItems((prev) => prev.map((n) => ({ ...n, read: true })))
              })
            }
            disabled={unread === 0}
          >
            <Check className="size-3" /> Mark all read
          </Button>
        </header>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{"You're all caught up."}</p>
          ) : (
            <ul>
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn(
                    'flex flex-col gap-1 border-b border-border/60 px-3 py-2 last:border-b-0',
                    !n.read && 'bg-accent/5'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      className={cn(
                        'mt-1 size-1.5 shrink-0 rounded-full',
                        n.severity === 'critical' && 'bg-destructive',
                        n.severity === 'warning' && 'bg-warning',
                        n.severity === 'info' && 'bg-info'
                      )}
                    />
                    <div className="flex-1">
                      <a href={n.href ?? '#'} className="text-sm font-medium hover:underline">
                        {n.title}
                      </a>
                      <p className="text-xs text-muted-foreground">{n.body}</p>
                      <p className="mt-1 font-tag text-[0.65rem] text-foreground/55">
                        {fmtRelativeTime(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="Mark read"
                        onClick={() =>
                          startTransition(async () => {
                            await onMarkRead(n.id)
                            setItems((prev) =>
                              prev.map((p) => (p.id === n.id ? { ...p, read: true } : p))
                            )
                          })
                        }
                      >
                        <Check className="size-3" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
