// tests/unit/components/alerts/alert-rule-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertRuleForm } from '@/components/features/alerts/alert-rule-form'

describe('AlertRuleForm', () => {
  it('submits a well-formed payload', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<AlertRuleForm onSubmit={onSubmit} channels={[{ id: 'ch_1', kind: 'slack', label: 'risk', target: 'x', createdBy: 'u1', createdAt: '2026-05-12T10:00:00.000Z' }]} />)
    await user.type(screen.getByLabelText(/label/i), 'high leverage')
    await user.selectOptions(screen.getByLabelText(/metric/i), 'leverage')
    await user.clear(screen.getByLabelText(/threshold/i))
    await user.type(screen.getByLabelText(/threshold/i), '0.75')
    await user.click(screen.getByLabelText(/channel ch_1/i))
    await user.click(screen.getByRole('button', { name: /save rule/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      label: 'high leverage',
      condition: expect.objectContaining({ metric: 'leverage', threshold: 0.75 }),
      channelIds: ['ch_1'],
    }))
  })
})
