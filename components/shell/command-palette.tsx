'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type PaletteCtx = { open: () => void; close: () => void; toggle: () => void; isOpen: boolean }

const Ctx = createContext<PaletteCtx | null>(null)

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false)
  const ctx = useMemo<PaletteCtx>(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      toggle: () => setOpen((v) => !v),
      isOpen,
    }),
    [isOpen]
  )
  return <Ctx.Provider value={ctx}>{children}</Ctx.Provider>
}

export function useCommandPalette(): PaletteCtx {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCommandPalette must be used inside CommandPaletteProvider')
  return v
}
