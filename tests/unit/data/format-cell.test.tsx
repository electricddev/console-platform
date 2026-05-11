import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cell } from '@/lib/data/format-cell'
import type { ColumnDescriptor } from '@/lib/data/types'

const col = (overrides: Partial<ColumnDescriptor> & Pick<ColumnDescriptor, 'format'>): ColumnDescriptor => ({
  id: 'x', label: 'X', ...overrides,
})

describe('<Cell />', () => {
  it('renders null as em-dash', () => {
    render(<Cell value={null} column={col({ format: 'integer' })} />)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders currency right-aligned mono', () => {
    const { container } = render(<Cell value={1234.5} column={col({ format: 'currency', unit: 'USD' })} />)
    expect(container.textContent).toContain('$1,235')
    expect(container.firstChild).toHaveClass('font-mono')
    expect(container.firstChild).toHaveClass('text-right')
  })

  it('renders percent', () => {
    render(<Cell value={0.075} column={col({ format: 'percent' })} />)
    expect(screen.getByText(/7\.5%/)).toBeInTheDocument()
  })

  it('renders enum as a badge with tone classes', () => {
    render(
      <Cell
        value="AAA"
        column={col({ format: 'enum', enumValues: { AAA: { tone: 'success' } } })}
      />
    )
    const badge = screen.getByText('AAA')
    expect(badge).toBeInTheDocument()
  })

  it('renders identifier mono', () => {
    const { container } = render(<Cell value="ldn_001" column={col({ format: 'identifier' })} />)
    expect(container.firstChild).toHaveClass('font-mono')
    expect(container.textContent).toBe('ldn_001')
  })

  it('renders boolean Yes/No', () => {
    render(<Cell value={true} column={col({ format: 'boolean' })} />)
    expect(screen.getByText('Yes')).toBeInTheDocument()
  })
})
