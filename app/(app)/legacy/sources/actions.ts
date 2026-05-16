'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/server'
import { connectSource } from '@/lib/api/endpoints/sources'
import { SourceTypeSchema } from '@/lib/api/schemas'

const CatalogPickInputSchema = z.object({
  type: SourceTypeSchema,
  name: z.string().min(2).max(80),
})

export async function connectFromCatalog(form: FormData) {
  const session = await requireRole('originator')
  const parsed = CatalogPickInputSchema.safeParse({
    type: form.get('type'),
    name: form.get('name'),
  })
  if (!parsed.success) {
    throw new Error('Invalid catalog selection')
  }
  const s = await connectSource({ user: session }, parsed.data)
  redirect(`/legacy/sources/${s.id}`)
}
