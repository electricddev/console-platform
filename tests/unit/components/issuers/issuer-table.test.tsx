import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { IssuerTable } from '@/components/features/issuers/issuer-table'
import type { IssuerCompliance } from '@/lib/api/schemas'

const rows: IssuerCompliance[] = [
  {
    issuerId: 'org_apollo', assetIds: ['ds_acred'],
    discipline: { expectedLast30d: 30, deliveredLast30d: 30, onTimeLast30d: 28, lastGapAt: null, cadenceBreakdown: [] },
    openRequestCount: 1,
  },
  {
    issuerId: 'org_janus', assetIds: ['ds_jaaa'],
    discipline: { expectedLast30d: 30, deliveredLast30d: 28, onTimeLast30d: 25, lastGapAt: null, cadenceBreakdown: [] },
    openRequestCount: 0,
  },
]

describe('IssuerTable', () => {
  it('renders one row per issuer with on-time %', () => {
    render(<IssuerTable issuers={rows} orgs={[
      { id: 'org_apollo', name: 'Apollo Asset Management', assetClasses: [], verified: true },
      { id: 'org_janus',  name: 'Janus Henderson',         assetClasses: [], verified: false },
    ]} />)
    expect(screen.getByText(/Apollo Asset Management/)).toBeInTheDocument()
    expect(screen.getByText(/Janus Henderson/)).toBeInTheDocument()
    expect(screen.getByText(/93%/)).toBeInTheDocument()  // 28/30
  })

  it('Apollo row links to /issuers/org_apollo', () => {
    render(<IssuerTable issuers={rows} orgs={[
      { id: 'org_apollo', name: 'Apollo Asset Management', assetClasses: [], verified: true },
    ]} />)
    const link = screen.getByRole('link', { name: /Apollo/i })
    expect(link).toHaveAttribute('href', '/issuers/org_apollo')
  })
})
