import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { CompanionContextProvider, useCompanionContext } from '@/components/v2/features/cp/companion/companion-context'

const baseValue = {
  code: 'SELECT 1',
  vault: null,
  fieldRefs: [],
  destinations: [],
  name: 'test',
  triggerKind: 'manual' as const,
  cronExpr: '',
  eventSource: '',
  onchainDests: [],
}

describe('CompanionContext', () => {
  it('exposes value to consumers', () => {
    const { result } = renderHook(() => useCompanionContext(), {
      wrapper: ({ children }) => (
        <CompanionContextProvider value={baseValue}>{children}</CompanionContextProvider>
      ),
    })
    expect(result.current.code).toBe('SELECT 1')
    expect(result.current.name).toBe('test')
  })

  it('throws when used outside provider', () => {
    expect(() => renderHook(() => useCompanionContext())).toThrow(
      /useCompanionContext must be used inside CompanionContextProvider/,
    )
  })
})
