'use server'

import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import type { Wallet } from '@/lib/api/types'

export async function addWallet(form: FormData) {
  const session = await requireUser()
  await settings.addWallet(
    { user: session },
    {
      label: String(form.get('label')),
      address: String(form.get('address')),
      kind: String(form.get('kind')) as Wallet['kind'],
    }
  )
}

export async function setPrimary(id: string) {
  const session = await requireUser()
  await settings.setPrimaryWallet({ user: session }, id)
}

export async function removeWallet(id: string) {
  const session = await requireUser()
  await settings.removeWallet({ user: session }, id)
}
