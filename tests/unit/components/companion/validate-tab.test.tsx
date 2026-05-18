import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ValidateTab } from '@/components/v2/features/cp/companion/validate-tab'
import { CompanionContextProvider } from '@/components/v2/features/cp/companion/companion-context'

const minimalCtx = {
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

describe('ValidateTab', () => {
  it('renders the aggregate status pill with count', () => {
    render(
      <CompanionContextProvider value={minimalCtx}>
        <ValidateTab onTabChange={() => {}} />
      </CompanionContextProvider>,
    )
    const pill = screen.getByTestId('validate-status-pill')
    expect(pill).toBeInTheDocument()
    expect(pill.textContent).toMatch(/issue/i)
  })

  it('sorts failed rows before passed rows', () => {
    render(
      <CompanionContextProvider value={minimalCtx}>
        <ValidateTab onTabChange={() => {}} />
      </CompanionContextProvider>,
    )
    const rows = screen.getAllByRole('listitem')
    const firstSeverity = within(rows[0]).getByTestId('row-severity').getAttribute('data-severity')
    expect(firstSeverity === 'fail' || firstSeverity === 'warn').toBe(true)
  })

  it('disables Submit when any check is failing', () => {
    render(
      <CompanionContextProvider value={minimalCtx}>
        <ValidateTab onTabChange={() => {}} />
      </CompanionContextProvider>,
    )
    expect(screen.getByRole('button', { name: /submit for review/i })).toBeDisabled()
  })
})
