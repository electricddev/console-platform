'use server'

import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import type { Member } from '@/lib/api/types'

export async function inviteMember(form: FormData) {
  const session = await requireUser()
  await settings.inviteMember(
    { user: session },
    {
      name: String(form.get('name')),
      email: String(form.get('email')),
      role: String(form.get('role')) as Member['role'],
    }
  )
}

export async function removeMember(id: string) {
  const session = await requireUser()
  await settings.removeMember({ user: session }, id)
}
