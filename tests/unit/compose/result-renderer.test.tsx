import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultRenderer } from '@/components/features/compose/result-renderer'
import type { CellResult } from '@/lib/data/methodology'

// ResponsiveContainer needs a real DOM with dimensions; in jsdom it renders nothing.
// Replace it with a wrapper that clones children and injects explicit width/height.
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  const React = await import('react')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div style={{ width: 400, height: 300 }}>
        {React.cloneElement(React.Children.only(children) as React.ReactElement<{ width?: number; height?: number }>, { width: 400, height: 300 })}
      </div>
    ),
  }
})

function r(columns: string[], rows: Record<string, unknown>[]): CellResult {
  return { columns, rows, runtimeMs: 0 }
}

describe('<ResultRenderer />', () => {
  it('renders empty state when no rows', () => {
    render(<ResultRenderer shape="metric" result={r(['value'], [])} />)
    expect(screen.getByText(/no rows/i)).toBeInTheDocument()
  })

  it('renders metric (single number)', () => {
    render(<ResultRenderer shape="metric" result={r(['value'], [{ value: 0.42 }])} />)
    // Some textual representation of 0.42 (or 42% if the renderer formats — be lenient)
    expect(screen.getByText(/0\.42|42/)).toBeInTheDocument()
  })

  it('renders comparison (two labeled bars)', () => {
    render(<ResultRenderer shape="comparison" result={r(['label', 'value'], [
      { label: 'Current', value: 7.8 },
      { label: '12mo ago', value: 6.4 },
    ])} />)
    expect(screen.getByText(/current/i)).toBeInTheDocument()
    expect(screen.getByText(/12mo ago/i)).toBeInTheDocument()
  })

  it('renders breakdown bars', () => {
    render(<ResultRenderer shape="breakdown" result={r(['label', 'value'], [
      { label: 'Tech', value: 100 },
      { label: 'Energy', value: 60 },
    ])} />)
    expect(screen.getByText(/tech/i)).toBeInTheDocument()
    expect(screen.getByText(/energy/i)).toBeInTheDocument()
  })

  it('renders time-series', () => {
    render(<ResultRenderer shape="time-series" result={r(['period', 'value'], [
      { period: '2024-01-01', value: 10 },
      { period: '2024-02-01', value: 12 },
    ])} />)
    // Recharts renders SVGs; assert the container has at least one path element.
    const container = document.querySelector('svg path')
    expect(container).toBeTruthy()
  })

  it('renders table for generic shape', () => {
    render(<ResultRenderer shape="table" result={r(['a', 'b'], [
      { a: 1, b: 'x' },
      { a: 2, b: 'y' },
    ])} />)
    expect(screen.getByText('x')).toBeInTheDocument()
    expect(screen.getByText('y')).toBeInTheDocument()
  })
})
