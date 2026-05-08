'use client'

import type { Role } from '@/lib/api/types'

type Props = { current: Role }

export function RoleSwitcher({ current }: Props) {
  if (process.env.NODE_ENV === 'production') return null

  const ROLES: Role[] = ['counterparty', 'originator', 'admin']

  return (
    <form
      action="/role-switch"
      method="post"
      className="fixed bottom-3 right-3 z-50 flex items-center gap-1 rounded-full border border-border bg-surface/90 p-1 text-xs shadow-sm backdrop-blur"
    >
      <span className="font-tag px-2 text-foreground/55">{'// dev'}</span>
      {ROLES.map((r) => (
        <button
          key={r}
          name="role"
          value={r}
          aria-pressed={r === current}
          className={`rounded-full px-2 py-1 transition-colors ${
            r === current
              ? 'bg-foreground text-background'
              : 'hover:bg-muted'
          }`}
        >
          {r}
        </button>
      ))}
    </form>
  )
}
