'use client'

import { useState, useCallback } from 'react'

export function useManageDrawer() {
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const open = useCallback((id: string) => setConnectionId(id), [])
  const close = useCallback(() => setConnectionId(null), [])
  return { connectionId, open, close }
}
