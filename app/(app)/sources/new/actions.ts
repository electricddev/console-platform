'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireRole } from '@/lib/auth/server'
import { connectSource } from '@/lib/api/endpoints/sources'
import { SourceTypeSchema } from '@/lib/api/schemas'

const CreateSourceInputSchema = z.object({
  name: z.string().min(2).max(80),
  type: SourceTypeSchema,
})

export async function createSource(form: FormData) {
  const session = await requireRole('originator')
  const parsed = CreateSourceInputSchema.safeParse({
    name: form.get('name'),
    type: form.get('type'),
  })
  if (!parsed.success) {
    throw new Error('Invalid input: ' + parsed.error.issues.map((i) => i.message).join(', '))
  }
  const s = await connectSource({ user: session }, parsed.data)
  redirect(`/sources/${s.id}`)
}
