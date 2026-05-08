'use client'

import { Search } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { WorkspaceSwitcher } from './workspace-switcher'
import { NetworkStatus } from './network-status'
import { NotificationsBell } from './notifications-bell'
import { UserMenu } from './user-menu'
import { useCommandPalette } from './command-palette'
import type { User, NetworkHealth, Notification } from '@/lib/api/types'

type Props = {
  user: User
  orgName: string
  networkHealth: NetworkHealth
  notifications: Notification[]
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
}

export function Topbar(props: Props) {
  const palette = useCommandPalette()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
      const meta = isMac ? e.metaKey : e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        palette.toggle()
      }
      if (e.key === '/' && !isInput(e.target)) {
        e.preventDefault()
        palette.open()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [palette])

  return (
    <div
      className="flex h-[var(--topbar-height)] items-center gap-2 border-b border-border bg-background px-3"
      role="banner"
    >
      <WorkspaceSwitcher orgName={props.orgName} />

      <div className="mx-auto w-full max-w-xl">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between text-muted-foreground"
          onClick={palette.open}
          aria-label="Open command palette"
        >
          <span className="flex items-center gap-2">
            <Search className="size-3.5" />
            Search datasets, templates, runs…
          </span>
          <kbd className="font-mono text-[0.65rem] text-foreground/55">⌘K</kbd>
        </Button>
      </div>

      <div className="flex items-center gap-1">
        <NetworkStatus initial={props.networkHealth} />
        <NotificationsBell
          initial={props.notifications}
          onMarkRead={props.onMarkRead}
          onMarkAllRead={props.onMarkAllRead}
        />
        <UserMenu user={props.user} orgName={props.orgName} />
      </div>
    </div>
  )
}

function isInput(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
}
