import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { PortfolioTable } from '@/components/features/portfolio/portfolio-table'
import { datasetFixtures } from '@/lib/api/fixtures/datasets'

describe('PortfolioTable', () => {
  it('renders one row per dataset', () => {
    render(<PortfolioTable datasets={datasetFixtures} />)
    expect(screen.getAllByRole('row').length).toBe(datasetFixtures.length + 1) // +header
  })

  it('ACRED row routes to /datasets/ds_acred', () => {
    render(<PortfolioTable datasets={datasetFixtures} />)
    const acredLink = screen.getByRole('link', { name: /ACRED/i })
    expect(acredLink).toHaveAttribute('href', '/datasets/ds_acred')
  })

  it('shows en-dash for datasets without briefSnapshot', () => {
    const legacyOnly = datasetFixtures.filter((d) => !d.briefSnapshot)
    if (legacyOnly.length === 0) return
    render(<PortfolioTable datasets={legacyOnly} />)
    const tbody = screen.getAllByRole('row').slice(1)
    tbody.forEach((row) => {
      const navCell = within(row).getAllByRole('cell')[2]
      expect(navCell.textContent).toContain('—')
    })
  })
})
