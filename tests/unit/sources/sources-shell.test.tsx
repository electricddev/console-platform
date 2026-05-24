import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourcesShell } from '@/components/v2/features/sources/sources-shell'

// Stub next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/sources',
}))

const fakeConnections = [
  {
    id: 'conn_1', connectorId: 'stripe', category: 'payments' as const, name: 'Stripe',
    subtitle: 'acct_x', status: 'ok' as const, lastSyncAt: new Date().toISOString(),
    cadence: '5min', datasetIds: ['ds1'],
  },
]
const fakeDatasets = [
  { id: 'ds1', connectionId: 'conn_1', name: 'charges', rowCount: 100, rowUnit: 'rows' as const,
    lastSyncAt: new Date().toISOString(), vaultIds: [] },
]

describe('<SourcesShell>', () => {
  it('renders the page title and Connected count badge', () => {
    render(<SourcesShell connections={fakeConnections} datasets={fakeDatasets} />)
    expect(screen.getByRole('heading', { name: 'Sources' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Connected/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Catalogue/i })).toBeInTheDocument()
  })

  it('renders the "+ Connect a source" CTA', () => {
    render(<SourcesShell connections={fakeConnections} datasets={fakeDatasets} />)
    expect(screen.getByRole('button', { name: /Connect a source/i })).toBeInTheDocument()
  })
})
