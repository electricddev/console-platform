'use client'

import { useEffect, useState } from 'react'

export function usePersistentState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [state, setState] = useState<T>(initial)

  useEffect(() => {
    const raw = window.localStorage.getItem(key)
    if (raw != null) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(JSON.parse(raw) as T)
      } catch {
        // ignore corrupt value
      }
    }
    // intentionally only on mount; key is treated as static
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set(v: T) {
    setState(v)
    try {
      window.localStorage.setItem(key, JSON.stringify(v))
    } catch {
      // quota or disabled storage; non-fatal
    }
  }

  return [state, set]
}
