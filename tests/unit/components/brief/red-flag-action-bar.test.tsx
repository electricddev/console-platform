import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RedFlagActionBar } from '@/components/features/brief/red-flag-action-bar'

describe('RedFlagActionBar', () => {
  it('fires onAcknowledge with note', async () => {
    const user = userEvent.setup()
    const onAck = vi.fn()
    render(<RedFlagActionBar flagId="f1" datasetId="ds_acred" sliderEligible={true}
      onAcknowledge={onAck} onSnooze={vi.fn()} onSetThreshold={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /acknowledge/i }))
    await user.type(screen.getByLabelText(/note/i), 'IC accepts.')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(onAck).toHaveBeenCalledWith('IC accepts.')
  })

  it('hides Set threshold when sliderEligible=false', () => {
    render(<RedFlagActionBar flagId="f1" datasetId="ds_acred" sliderEligible={false}
      onAcknowledge={vi.fn()} onSnooze={vi.fn()} onSetThreshold={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /set threshold/i })).toBeNull()
  })

  it('fires onSnooze immediately', async () => {
    const user = userEvent.setup()
    const onSnooze = vi.fn()
    render(<RedFlagActionBar flagId="f1" datasetId="ds_acred" sliderEligible={true}
      onAcknowledge={vi.fn()} onSnooze={onSnooze} onSetThreshold={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /snooze 7d/i }))
    expect(onSnooze).toHaveBeenCalledTimes(1)
  })
})
