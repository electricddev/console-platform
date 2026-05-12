// tests/unit/components/brief/anomaly-action-bar.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnomalyActionBar } from '@/components/features/brief/anomaly-action-bar'

describe('AnomalyActionBar', () => {
  it('fires onDismiss with reason', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<AnomalyActionBar anomalyId="e1" onDismiss={onDismiss} onPinToMemo={vi.fn()} onConvertToRule={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await user.type(screen.getByLabelText(/reason/i), 'already in memo')
    await user.click(screen.getByRole('button', { name: /save dismissal/i }))
    expect(onDismiss).toHaveBeenCalledWith('already in memo')
  })

  it('fires onPinToMemo and onConvertToRule', async () => {
    const user = userEvent.setup()
    const onPin = vi.fn(); const onConvert = vi.fn()
    render(<AnomalyActionBar anomalyId="e1" onDismiss={vi.fn()} onPinToMemo={onPin} onConvertToRule={onConvert} />)
    await user.click(screen.getByRole('button', { name: /pin to memo/i }))
    expect(onPin).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /convert to alert rule/i }))
    expect(onConvert).toHaveBeenCalled()
  })
})
