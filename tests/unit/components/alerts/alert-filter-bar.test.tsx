// tests/unit/components/alerts/alert-filter-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertFilterBar } from '@/components/features/alerts/alert-filter-bar'

describe('AlertFilterBar', () => {
  it('toggles kind filters and reports back', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<AlertFilterBar onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: /filing/i }))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ kinds: ['filing'] }))
  })
})
