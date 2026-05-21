'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useSetupFlow(): {
  pendingConnectorId: string | null
  start: (connectorId: string) => void
  end: () => void
} {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const pendingConnectorId = params.get('add')

  const start = useCallback(
    (connectorId: string) => {
      const next = new URLSearchParams(params)
      next.set('add', connectorId)
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router],
  )

  const end = useCallback(() => {
    const next = new URLSearchParams(params)
    next.delete('add')
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [params, pathname, router])

  return { pendingConnectorId, start, end }
}
