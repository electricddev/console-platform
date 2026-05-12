import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnomalyFeed } from '@/components/features/brief/anomaly-feed'
import type { AnomalyEvent } from '@/lib/api/schemas'

const evt = (over: Partial<AnomalyEvent>): AnomalyEvent => ({
  id: 'e', occurredAt: new Date(Date.now() - 86_400_000).toISOString(),
  kind: 'credit-event', severity: 'medium', title: 'X',
  borrowerNormalized: 'borrower x', detailHref: '/datasets/ds_acred/explore', ...over,
})

describe('AnomalyFeed', () => {
  it('renders empty state when feed is empty', () => {
    render(<AnomalyFeed events={[]} />)
    expect(screen.getByText(/no events in this window/i)).toBeInTheDocument()
  })

  it('renders a row per event with a relative timestamp', () => {
    render(<AnomalyFeed events={[evt({ id: 'a' }), evt({ id: 'b', kind: 'filing', borrowerNormalized: null, title: 'Filed Q1' })]} />)
    expect(screen.getAllByRole('listitem').length).toBe(2)
  })

  it('credit-event rows link to detailHref', () => {
    render(<AnomalyFeed events={[evt({ id: 'a', detailHref: '/x' })]} />)
    expect(screen.getByRole('link', { name: /X/i })).toHaveAttribute('href', '/x')
  })
})
