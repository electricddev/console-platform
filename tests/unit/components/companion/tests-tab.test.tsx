import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TestsTab } from '@/components/v2/features/cp/companion/tests-tab'
import { CompanionContextProvider } from '@/components/v2/features/cp/companion/companion-context'

const emptyCtx = {
  code: '',
  vault: null,
  fieldRefs: [],
  destinations: [],
  name: '',
  triggerKind: 'manual' as const,
  cronExpr: '',
  eventSource: '',
  onchainDests: [],
}

describe('TestsTab', () => {
  it('shows empty-state copy when no SELECT statement', () => {
    render(<CompanionContextProvider value={emptyCtx}><TestsTab /></CompanionContextProvider>)
    expect(screen.getByText(/Write a SELECT statement/i)).toBeInTheDocument()
  })
})
