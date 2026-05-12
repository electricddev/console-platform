import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IssuerActionPanel } from '@/components/features/issuers/issuer-action-panel'

describe('IssuerActionPanel', () => {
  it('opens the attestation-request form and submits with payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<IssuerActionPanel issuerId="org_apollo" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /request weekly leverage/i }))
    await user.click(screen.getByRole('button', { name: /submit request/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      issuerId: 'org_apollo',
      kind: 'attestation-request',
    }))
  })

  it('opens the gap-acceptance form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<IssuerActionPanel issuerId="org_apollo" onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: /mark gap as accepted/i }))
    await user.type(screen.getByLabelText(/reason/i), 'Acceptable trade-off')
    await user.click(screen.getByRole('button', { name: /submit acceptance/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gap-acceptance' }))
  })
})
