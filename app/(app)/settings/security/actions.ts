'use server'

import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'

export async function updateSso(provider: 'none' | 'okta' | 'azure-ad' | 'google') {
  const session = await requireUser()
  await settings.updateSecurity({ user: session }, { ssoProvider: provider })
}

export async function updateAllowlist(list: string[]) {
  const session = await requireUser()
  await settings.updateSecurity({ user: session }, { ipAllowlist: list })
}

export async function revokeSessionAction(id: string) {
  const session = await requireUser()
  await settings.revokeSession({ user: session }, id)
}
