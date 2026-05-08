import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyableHash } from '@/components/common/copyable-hash'

describe('CopyableHash', () => {
  it('renders a truncated hash by default', () => {
    render(<CopyableHash value="0xabcdef0123456789abcdef0123456789abcdef01" />)
    expect(screen.getByRole('button')).toHaveTextContent(/0xabcdef…/)
  })

  it('renders the full hash when short=false', () => {
    render(<CopyableHash value="0xabc" short={false} />)
    expect(screen.getByRole('button')).toHaveTextContent('0xabc')
  })

  it('copies the full hash to clipboard on click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<CopyableHash value="0xfullhash" />)
    await userEvent.click(screen.getByRole('button'))
    expect(writeText).toHaveBeenCalledWith('0xfullhash')
  })
})
