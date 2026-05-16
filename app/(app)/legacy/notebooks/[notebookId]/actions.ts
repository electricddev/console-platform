'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { createNotebook } from '@/lib/api/endpoints/notebooks'

export async function createNotebookAction(form: FormData) {
  const session = await requireUser()
  const n = await createNotebook({ user: session }, { title: String(form.get('title')) })
  redirect(`/legacy/notebooks/${n.id}`)
}
