// tests/unit/components/memo/memo-section-shell.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoSectionShell } from '@/components/features/memo/memo-section-shell'

describe('MemoSectionShell', () => {
  it('renders the C label, prompt, and children slot', () => {
    render(
      <MemoSectionShell letter="C" name="Character" prompt="Issuer track record and reputation.">
        <p>body here</p>
      </MemoSectionShell>
    )
    expect(screen.getByText('C')).toBeInTheDocument()
    expect(screen.getByText('Character')).toBeInTheDocument()
    expect(screen.getByText(/Issuer track record/)).toBeInTheDocument()
    expect(screen.getByText('body here')).toBeInTheDocument()
  })
})
