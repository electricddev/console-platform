import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { CommandPaletteProvider } from './command-palette'
import { RoleSwitcher } from './role-switcher'
import type { User, Org, NetworkHealth, Notification } from '@/lib/api/types'

type Props = {
  user: User
  org: Org
  notifications: Notification[]
  networkHealth: NetworkHealth
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
  children: ReactNode
}

export function AppShell({
  user,
  org,
  notifications,
  networkHealth,
  onMarkRead,
  onMarkAllRead,
  children,
}: Props) {
  return (
    <CommandPaletteProvider>
      <div className="flex min-h-screen">
        <Sidebar role={user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            user={user}
            orgName={org.name}
            networkHealth={networkHealth}
            notifications={notifications}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
          />
          <main className="flex-1 overflow-auto bg-background">{children}</main>
        </div>
      </div>
      <RoleSwitcher current={user.role} />
    </CommandPaletteProvider>
  )
}
