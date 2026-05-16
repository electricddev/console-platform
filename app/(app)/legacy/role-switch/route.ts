import { NextResponse, type NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { fixtures, DEMO_PERSONA_IDS } from '@/lib/api/fixtures'
import { RoleSchema } from '@/lib/api/schemas'

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const formData = await req.formData()
  const next = formData.get('role')
  const parsed = RoleSchema.safeParse(next)
  if (!parsed.success) {
    return new NextResponse('Bad role', { status: 400 })
  }

  const personaKey = parsed.data === 'admin' ? 'admin' : parsed.data === 'originator' ? 'originator' : 'counterparty'
  const userId = DEMO_PERSONA_IDS[personaKey]
  const user = fixtures.users.find((u) => u.id === userId)!

  const session = await getSession()
  session.userId = user.id
  session.orgId = user.orgId
  session.role = user.role
  await session.save()

  return NextResponse.redirect(new URL('/legacy', req.url))
}
