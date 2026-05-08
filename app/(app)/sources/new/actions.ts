'use server'

import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/server'
import { connectSource } from '@/lib/api/endpoints/sources'
import type { Source } from '@/lib/api/types'

export async function createSource(form: FormData) {
  const session = await requireRole('originator')
  const name = String(form.get('name'))
  const type = String(form.get('type')) as Source['type']
  const s = await connectSource({ user: session }, { name, type })
  redirect(`/sources/${s.id}`)
}
