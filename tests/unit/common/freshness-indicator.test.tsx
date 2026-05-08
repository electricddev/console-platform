import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'

describe('FreshnessIndicator', () => {
  it('renders "live" for very recent timestamps', () => {
    const recent = new Date(Date.now() - 5_000).toISOString()
    render(<FreshnessIndicator timestamp={recent} />)
    expect(screen.getByText(/live|seconds/i)).toBeInTheDocument()
  })

  it('renders the relative label for older timestamps', () => {
    const old = new Date(Date.now() - 6 * 3600_000).toISOString()
    render(<FreshnessIndicator timestamp={old} />)
    expect(screen.getByText(/hours ago/i)).toBeInTheDocument()
  })

  it('renders dash for missing timestamp', () => {
    render(<FreshnessIndicator timestamp={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})
