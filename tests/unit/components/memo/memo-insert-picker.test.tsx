import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoInsertPicker } from '@/components/features/memo/memo-insert-picker'

describe('MemoInsertPicker', () => {
  it('lists the methodologies for the given section', async () => {
    const user = userEvent.setup()
    render(<MemoInsertPicker sectionKey="capital" onInsert={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /insert data/i }))
    expect(screen.getByText(/Top-10 borrower exposure/i)).toBeInTheDocument()
  })

  it('calls onInsert with the methodologyId when a candidate is clicked', async () => {
    const user = userEvent.setup()
    const onInsert = vi.fn()
    render(<MemoInsertPicker sectionKey="capital" onInsert={onInsert} />)
    await user.click(screen.getByRole('button', { name: /insert data/i }))
    await user.click(screen.getByRole('button', { name: /Top-10 borrower exposure/i }))
    expect(onInsert).toHaveBeenCalledWith('acred.top10_borrowers')
  })
})
