import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrillOutActions } from '@/components/features/brief/drill-out-actions'

describe('DrillOutActions', () => {
  it('renders the three CTAs with correct hrefs', () => {
    render(<DrillOutActions
      exploreNonAccrualHref="/datasets/ds_acred/explore?table=holdings"
      memoHref="/notebooks/new?prefill=acred-brief-2026-q1"
      filingsHref="/datasets/ds_acred/runs"
      nonAccrualCount={12}
    />)
    expect(screen.getByRole('link', { name: /12 non-accrual holdings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /draft dd memo/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /raw filings/i })).toBeInTheDocument()
  })
})
