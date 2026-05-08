import type { ReactNode } from 'react'
import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api/endpoints/notifications'
import { fixtures } from '@/lib/api/fixtures'
import { AppShell } from '@/components/shell/app-shell'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const sessionUser = await requireUser()
  const ctx = { user: sessionUser }

  const [user, notifications] = await Promise.all([
    getCurrentUser(ctx),
    listMyNotifications(ctx),
  ])
  const org = fixtures.orgs.find((o) => o.id === user.orgId)
  if (!org) throw new Error(`Fixture org missing for ${user.orgId}`)

  return (
    <AppShell
      user={user}
      org={org}
      notifications={notifications}
      networkHealth={fixtures.networkHealth}
      onMarkRead={async (id) => {
        'use server'
        await markNotificationRead({ user: sessionUser }, id)
      }}
      onMarkAllRead={async () => {
        'use server'
        await markAllNotificationsRead({ user: sessionUser })
      }}
    >
      {children}
    </AppShell>
  )
}
