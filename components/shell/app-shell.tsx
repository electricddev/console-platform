import type { ReactNode } from 'react'
import { Sidebar } from './sidebar'
import { Topbar } from './topbar'
import { CommandPaletteProvider } from './command-palette'
import { RoleSwitcher } from './role-switcher'
import { StatusBanner } from './status-banner'
import type { User, Org, NetworkHealth, Notification, StatusReport } from '@/lib/api/types'
import type { Density } from '@/lib/auth/types'

type Props = {
  user: User
  org: Org
  density?: Density
  notifications: Notification[]
  networkHealth: NetworkHealth
  status: StatusReport
  onMarkRead: (id: string) => Promise<void>
  onMarkAllRead: () => Promise<void>
  children: ReactNode
}

export function AppShell({
  user,
  org,
  density,
  notifications,
  networkHealth,
  status,
  onMarkRead,
  onMarkAllRead,
  children,
}: Props) {
  return (
    <CommandPaletteProvider>
      <div className="flex h-screen">
        <Sidebar role={user.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <StatusBanner status={status} />
          <Topbar
            user={user}
            orgName={org.name}
            density={density}
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
