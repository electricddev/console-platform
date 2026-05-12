import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoFlagChecklist } from '@/components/features/memo/memo-flag-checklist'
import type { RedFlag, FlagDecision } from '@/lib/api/schemas'

const flags: RedFlag[] = [
  { id: 'f1', label: 'Leverage high', severity: 'high', reason: '78%', drillHref: null },
  { id: 'f2', label: 'PIK rising',    severity: 'medium', reason: '+1.1pp', drillHref: null },
]
const decisions: FlagDecision[] = []

describe('MemoFlagChecklist', () => {
  it('renders one row per active flag', () => {
    render(<MemoFlagChecklist flags={flags} decisions={decisions} onDecide={vi.fn()} readOnly={false} />)
    expect(screen.getByText(/Leverage high/)).toBeInTheDocument()
    expect(screen.getByText(/PIK rising/)).toBeInTheDocument()
  })

  it('requires a note before submitting an acknowledge decision', async () => {
    const user = userEvent.setup()
    const onDecide = vi.fn()
    render(<MemoFlagChecklist flags={flags} decisions={decisions} onDecide={onDecide} readOnly={false} />)
    await user.click(screen.getAllByRole('button', { name: /acknowledge/i })[0])
    await user.click(screen.getByRole('button', { name: /save decision/i }))
    expect(onDecide).not.toHaveBeenCalled()
    await user.type(screen.getByLabelText(/note/i), 'IC accepts the leverage profile.')
    await user.click(screen.getByRole('button', { name: /save decision/i }))
    expect(onDecide).toHaveBeenCalledTimes(1)
  })

  it('shows existing decisions and hides controls in readOnly', () => {
    render(<MemoFlagChecklist
      flags={flags}
      decisions={[{ flagId: 'f1', action: 'acknowledge', note: 'ok', decidedAt: '2026-05-12T10:00:00.000Z', decidedBy: 'u1' }]}
      onDecide={vi.fn()}
      readOnly={true}
    />)
    expect(screen.getByText(/Acknowledged/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /acknowledge/i })).toBeNull()
  })
})
