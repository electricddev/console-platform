import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConfirmStep } from '@/components/v2/features/sources/add-source-modal/steps/confirm-step'

const discovered = [
  { id: 'charges', name: 'charges', subtitle: 'rows · 187K / mo', rowCount: 187_240, rowUnit: 'rows' as const },
  { id: 'invoices', name: 'invoices', subtitle: 'rows · 12K / mo', rowCount: 12_410, rowUnit: 'rows' as const },
]

describe('<ConfirmStep>', () => {
  it('formats the row estimate from selected datasets', () => {
    render(
      <ConfirmStep
        connectorId="stripe"
        discovered={discovered}
        selectedIds={['charges', 'invoices']}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/~200K rows \/ month/)).toBeInTheDocument()
  })

  it('expands a row to show a sample preview', () => {
    render(
      <ConfirmStep
        connectorId="stripe"
        discovered={discovered}
        selectedIds={['charges']}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Show sample for charges/i }))
    expect(screen.getByText('amount')).toBeInTheDocument()
    expect(screen.getAllByText(/^ch_3Q/).length).toBeGreaterThan(0)
  })

  it('CTA uses the connector name', () => {
    render(
      <ConfirmStep
        connectorId="stripe"
        discovered={discovered}
        selectedIds={['charges']}
        onToggle={vi.fn()}
        onToggleAll={vi.fn()}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Connect Stripe →/i })).toBeInTheDocument()
  })
})
