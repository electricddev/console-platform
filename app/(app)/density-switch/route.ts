import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const next = form.get('density')
  const value = next === 'comfortable' ? 'comfortable' : 'compact'

  const session = await getSession()
  session.density = value
  await session.save()

  const back = (form.get('returnTo') as string) || '/'
  return NextResponse.redirect(new URL(back, req.url))
}
