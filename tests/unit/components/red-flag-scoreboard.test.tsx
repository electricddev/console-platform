import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RedFlagScoreboard } from '@/components/features/brief/red-flag-scoreboard'
import type { RedFlag } from '@/lib/api/schemas'

const flags: RedFlag[] = [
  { id: 'r1', label: 'Non-accrual % rose 21bps QoQ', severity: 'medium', reason: '12 holdings', drillHref: '/datasets/ds_acred/explore?table=holdings' },
  { id: 'r2', label: 'Leverage > 75%', severity: 'high', reason: 'Currently 78%', drillHref: null },
]

describe('RedFlagScoreboard', () => {
  it('renders tripped count vs total rules', () => {
    render(<RedFlagScoreboard flags={flags} totalRules={8} />)
    expect(screen.getByText(/2 of 8 tripped/i)).toBeInTheDocument()
  })

  it('renders an empty state when no flags', () => {
    render(<RedFlagScoreboard flags={[]} totalRules={8} />)
    expect(screen.getByText(/no red flags tripped/i)).toBeInTheDocument()
  })

  it('renders a link for flags with drillHref and plain text otherwise', () => {
    render(<RedFlagScoreboard flags={flags} totalRules={8} />)
    expect(screen.getByRole('link', { name: /non-accrual/i })).toHaveAttribute('href', '/datasets/ds_acred/explore?table=holdings')
    expect(screen.queryByRole('link', { name: /leverage > 75%/i })).toBeNull()
  })
})
