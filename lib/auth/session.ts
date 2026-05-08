import 'server-only'
import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import type { SessionData } from './types'

export { sessionDataSchema } from './schemas'

const SESSION_PASSWORD = process.env.SESSION_PASSWORD ?? 'dev-only-change-me-this-must-be-32-chars-min'

export const sessionOptions: SessionOptions = {
  password: SESSION_PASSWORD,
  cookieName: 'hyve_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

export async function getSession() {
  const cookieStore = await cookies()
  return getIronSession<SessionData>(cookieStore, sessionOptions)
}
