import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DeltaTile } from '@/components/features/brief/delta-tile'
import { DeltaCell } from '@/components/features/portfolio/delta-cell'
import { AttestationCell } from '@/components/features/portfolio/attestation-cell'

describe('DeltaTile', () => {
  it('renders a value, label, and signed delta', () => {
    render(
      <DeltaTile
        label="Leverage"
        delta={{ value: 0.73, delta: 0.004, deltaKind: 'pp', tone: 'negative' }}
        formatValue={(v) => `${(v * 100).toFixed(1)}%`}
      />
    )
    expect(screen.getByText('Leverage')).toBeInTheDocument()
    expect(screen.getByText('73.0%')).toBeInTheDocument()
    expect(screen.getByText(/\+0\.4(0)?pp/)).toBeInTheDocument()
  })
})

describe('DeltaCell', () => {
  it('renders nothing when delta undefined', () => {
    render(<DeltaCell delta={undefined} formatValue={(v) => `${v}`} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('AttestationCell', () => {
  it('renders on-time percentage and relative timestamp', () => {
    const tenMinAgo = new Date(Date.now() - 600_000).toISOString()
    render(<AttestationCell onTimePct={0.93} lastAttestedAt={tenMinAgo} />)
    expect(screen.getByText(/93%/)).toBeInTheDocument()
  })
})
