'use client'
import { createContext, useContext, type ReactNode } from 'react'
import type { CompanionContextValue } from './companion-panel.types'

const CompanionContext = createContext<CompanionContextValue | null>(null)

export function CompanionContextProvider({
  value,
  children,
}: {
  value: CompanionContextValue
  children: ReactNode
}) {
  return <CompanionContext.Provider value={value}>{children}</CompanionContext.Provider>
}

export function useCompanionContext(): CompanionContextValue {
  const ctx = useContext(CompanionContext)
  if (!ctx) {
    throw new Error('useCompanionContext must be used inside CompanionContextProvider')
  }
  return ctx
}
