// tests/unit/components/brief/watch-toggle.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WatchToggle } from '@/components/features/brief/watch-toggle'

describe('WatchToggle', () => {
  it('shows "Watch" when not watching and toggles', async () => {
    const user = userEvent.setup()
    const onWatch = vi.fn()
    render(<WatchToggle datasetId="ds_acred" initialWatching={false} initialChannels={[]} onWatch={onWatch} onUnwatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /watch/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /watch/i }))
    expect(onWatch).toHaveBeenCalled()
  })

  it('shows "Watching" when initialWatching=true', () => {
    render(<WatchToggle datasetId="ds_acred" initialWatching={true} initialChannels={['slack']} onWatch={vi.fn()} onUnwatch={vi.fn()} />)
    expect(screen.getByRole('button', { name: /watching/i })).toBeInTheDocument()
  })
})
