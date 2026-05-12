import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AmmOpsPanel } from '@/components/features/amm/amm-ops-panel'
import { acredAmmFeed } from '@/lib/data/acred/amm'

afterEach(() => { vi.useRealTimers() })

describe('AmmOpsPanel', () => {
  it('initially renders the four tiles and 24h stats', () => {
    render(<AmmOpsPanel initial={acredAmmFeed} />)
    expect(screen.getByText(/Live NAV/i)).toBeInTheDocument()
    expect(screen.getByText(/Inventory/i)).toBeInTheDocument()
    expect(screen.getByText(/47 swaps/)).toBeInTheDocument()
  })

  it('mutates NAV via the interval', () => {
    vi.useFakeTimers()
    render(<AmmOpsPanel initial={acredAmmFeed} />)
    const before = screen.getByLabelText('NAV per token').textContent
    act(() => { vi.advanceTimersByTime(10_500) })
    const after = screen.getByLabelText('NAV per token').textContent
    expect(after).not.toBe(before)
  })
})
