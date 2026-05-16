import type { ReactNode } from 'react'
import { requireRole } from '@/lib/auth/server'

export default async function SchemasLayout({ children }: { children: ReactNode }) {
  await requireRole('originator')
  return <>{children}</>
}
