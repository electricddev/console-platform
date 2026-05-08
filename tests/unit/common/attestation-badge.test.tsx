import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttestationBadge } from '@/components/common/attestation-badge'

const ATTESTATION = {
  teeMeasurement: '0x' + 'aa'.repeat(32),
  codeHash: '0x' + 'bb'.repeat(32),
  outputSignature: '0x' + 'cc'.repeat(32),
  anchorTxHash: '0x' + 'dd'.repeat(32),
  anchorBlockNumber: 12345,
  anchorChain: 'ethereum' as const,
  anchoredAt: '2026-05-08T10:00:00Z',
}

describe('AttestationBadge', () => {
  it('renders a "verified" pill', () => {
    render(<AttestationBadge attestation={ATTESTATION} />)
    expect(screen.getByText(/verified/i)).toBeInTheDocument()
  })

  it('opens a popover with the three core hashes on click', async () => {
    render(<AttestationBadge attestation={ATTESTATION} />)
    await userEvent.click(screen.getByRole('button'))
    expect(screen.getByText(/TEE measurement/i)).toBeInTheDocument()
    expect(screen.getByText(/Code hash/i)).toBeInTheDocument()
    expect(screen.getByText(/Output signature/i)).toBeInTheDocument()
  })

  it('falls back to "unattested" when attestation is missing', () => {
    render(<AttestationBadge attestation={null} />)
    expect(screen.getByText(/unattested/i)).toBeInTheDocument()
  })
})
