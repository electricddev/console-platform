import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import { SsoConfigForm } from '@/components/features/settings/sso-config-form'
import { IpAllowlistForm } from '@/components/features/settings/ip-allowlist-form'
import { ActiveSessionsTable } from '@/components/features/settings/active-sessions-table'
import { revokeSessionAction } from './actions'

export default async function SecurityPage() {
  const session = await requireUser()
  const ctx = { user: session }
  const [sec, sessions] = await Promise.all([
    settings.getSecurity(ctx),
    settings.listActiveSessions(ctx),
  ])
  return (
    <div className="grid gap-6">
      <SsoConfigForm initial={sec.ssoProvider} />
      <IpAllowlistForm initial={sec.ipAllowlist} />
      <ActiveSessionsTable
        sessions={sessions}
        onRevoke={async (id) => {
          'use server'
          await revokeSessionAction(id)
        }}
      />
    </div>
  )
}
