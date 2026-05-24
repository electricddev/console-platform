import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustStep } from '@/components/v2/features/sources/add-source-modal/steps/trust-step'

describe('<TrustStep>', () => {
  it('renders the four rows for a wired connector (stripe)', () => {
    render(<TrustStep connectorId="stripe" onContinue={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /What Hyve will do with your Stripe data/i })).toBeInTheDocument()
    expect(screen.getByText(/Reads/i)).toBeInTheDocument()
    expect(screen.getByText(/Storage/i)).toBeInTheDocument()
    expect(screen.getByText(/Audit/i)).toBeInTheDocument()
    expect(screen.getByText(/Revoke/i)).toBeInTheDocument()
    // Identifiers are rendered as individual pill spans — check each one is present.
    expect(screen.getByText('charges')).toBeInTheDocument()
    expect(screen.getByText('invoices')).toBeInTheDocument()
    expect(screen.getByText('customers')).toBeInTheDocument()
    expect(screen.getByText('refunds')).toBeInTheDocument()
    expect(screen.getByText('subscriptions')).toBeInTheDocument()
  })

  it('renders a fallback for an unknown connector', () => {
    render(<TrustStep connectorId="__nope__" onContinue={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/No trust copy available/i)).toBeInTheDocument()
  })
})
