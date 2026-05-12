import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PeerDispersionPanel } from '@/components/features/brief/peer-dispersion-panel'
import { AttestationDisciplineTile } from '@/components/features/brief/attestation-discipline-tile'
import { acredPeerDispersion } from '@/lib/data/acred/peers'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'

describe('PeerDispersionPanel', () => {
  it('renders the demo badge', () => {
    render(<PeerDispersionPanel rows={acredPeerDispersion} />)
    expect(screen.getByText(/demo/i)).toBeInTheDocument()
  })
})

describe('AttestationDisciplineTile', () => {
  it('renders each cadence row', () => {
    render(<AttestationDisciplineTile discipline={acredAttestationDiscipline} />)
    expect(screen.getAllByRole('row').length).toBeGreaterThanOrEqual(4)
  })
})
