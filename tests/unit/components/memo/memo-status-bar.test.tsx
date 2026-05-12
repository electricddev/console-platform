import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoStatusBar } from '@/components/features/memo/memo-status-bar'

describe('MemoStatusBar', () => {
  it('shows Submit button on draft for counterparty', () => {
    render(<MemoStatusBar memoStatus="draft" userRole="counterparty" onSubmit={vi.fn()} onApprove={vi.fn()} onRequestChanges={vi.fn()} />)
    expect(screen.getByRole('button', { name: /submit for IC review/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /approve/i })).toBeNull()
  })

  it('shows Approve and Request changes on submitted for admin', () => {
    render(<MemoStatusBar memoStatus="submitted" userRole="admin" onSubmit={vi.fn()} onApprove={vi.fn()} onRequestChanges={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /request changes/i })).toBeInTheDocument()
  })

  it('shows no actions when approved', () => {
    render(<MemoStatusBar memoStatus="approved" userRole="counterparty" onSubmit={vi.fn()} onApprove={vi.fn()} onRequestChanges={vi.fn()} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText(/Approved/i)).toBeInTheDocument()
  })
})
