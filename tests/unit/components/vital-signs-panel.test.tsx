import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VitalSignsPanel } from '@/components/features/brief/vital-signs-panel'
import { acredFacts } from '@/lib/data/acred/facts'

describe('VitalSignsPanel', () => {
  it('renders all six vital tiles', () => {
    render(<VitalSignsPanel snapshot={acredFacts.snapshot} />)
    ;['NAV', 'Leverage', 'Non-accrual', 'Top-10 concentration', 'PIK', 'Net flow'].forEach((label) => {
      expect(screen.getByText(new RegExp(label, 'i'))).toBeInTheDocument()
    })
  })
})
