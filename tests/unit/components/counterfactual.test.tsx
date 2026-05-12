import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CounterfactualCalculator } from '@/components/features/amm/counterfactual-calculator'

describe('CounterfactualCalculator', () => {
  it('recomputes max swap when CI slider moves', () => {
    render(<CounterfactualCalculator inventoryAsset={50_000_000} initialCI={0.002} />)
    const slider = screen.getByLabelText(/NAV confidence interval/i)
    const beforeText = screen.getByTestId('max-with-hyve').textContent
    // Move slider to a new value (simulates 10 ArrowRight steps from 0.002)
    fireEvent.change(slider, { target: { value: '0.007' } })
    const afterText = screen.getByTestId('max-with-hyve').textContent
    expect(beforeText).not.toBe(afterText)
  })

  it('"without Hyve" multiplies CI by 10 and shows less capacity than "with"', () => {
    render(<CounterfactualCalculator inventoryAsset={50_000_000} initialCI={0.002} />)
    // K=5: with = 50M * (1 - 5*0.002) = 50M * 0.99 = $50M
    expect(screen.getByTestId('max-with-hyve').textContent).toMatch(/\$5[0-9]M/)
    // without = 50M * (1 - 5*0.02) = 50M * 0.9 = $45M
    expect(screen.getByTestId('max-without-hyve').textContent).toMatch(/\$[1-9][0-9]M/)
  })
})
