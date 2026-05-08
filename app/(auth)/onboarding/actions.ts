'use server'

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'

export async function completeOnboarding(form: FormData) {
  const density = form.get('density') === 'comfortable' ? 'comfortable' : 'compact'
  const session = await getSession()
  session.density = density
  await session.save()
  redirect('/')
}
