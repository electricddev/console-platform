'use client'

import { useCallback, useEffect, useState } from 'react'

export function useCatalogSheet() {
  const [open, setOpen] = useState(false)
  const openSheet = useCallback(() => setOpen(true), [])
  const closeSheet = useCallback(() => setOpen(false), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isCmdK) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return { open, openSheet, closeSheet }
}
