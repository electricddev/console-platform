import { describe, it, expect } from 'vitest'
import { composerReducer, initialComposerState } from '@/components/features/compose/composer-reducer'
import type { Methodology } from '@/lib/data/methodology'
import type { NotebookCell } from '@/lib/api/types'

const sampleMethodology: Methodology = {
  id: 'acred.nav_trend',
  title: 'NAV over time',
  description: 'NAV per period.',
  axis: 'time',
  shape: 'time-series',
  dsl: 'SELECT period_end_date AS period, total_nav AS value FROM fund_overview',
}

describe('composerReducer', () => {
  const start: NotebookCell[] = [{ id: 'c1', kind: 'markdown', markdown: '# Title' }]

  it('add-methodology appends a query cell with methodology metadata', () => {
    const s = composerReducer(initialComposerState(start), { type: 'add-methodology', methodology: sampleMethodology })
    expect(s.cells.length).toBe(2)
    const last = s.cells[1]
    expect(last.kind).toBe('query')
    if (last.kind === 'query') {
      expect(last.methodologyId).toBe('acred.nav_trend')
      expect(last.renderShape).toBe('time-series')
      expect(last.dsl).toContain('SELECT')
    }
    expect(s.dirty).toBe(true)
  })

  it('add-markdown appends a markdown cell', () => {
    const s = composerReducer(initialComposerState(start), { type: 'add-markdown' })
    expect(s.cells.length).toBe(2)
    expect(s.cells[1].kind).toBe('markdown')
    expect(s.dirty).toBe(true)
  })

  it('add-blank-query appends an empty query cell with renderShape table', () => {
    const s = composerReducer(initialComposerState(start), { type: 'add-blank-query' })
    expect(s.cells.length).toBe(2)
    const last = s.cells[1]
    expect(last.kind).toBe('query')
    if (last.kind === 'query') {
      expect(last.renderShape).toBe('table')
      expect(last.methodologyId).toBeUndefined()
    }
    expect(s.dirty).toBe(true)
  })

  it('remove-cell drops the cell with that id', () => {
    const s = composerReducer(initialComposerState(start), { type: 'remove-cell', id: 'c1' })
    expect(s.cells.length).toBe(0)
    expect(s.dirty).toBe(true)
  })

  it('move-cell up swaps with previous; respects bounds', () => {
    const seed: NotebookCell[] = [
      { id: 'a', kind: 'markdown', markdown: 'A' },
      { id: 'b', kind: 'markdown', markdown: 'B' },
    ]
    const s = composerReducer(initialComposerState(seed), { type: 'move-cell', id: 'b', dir: 'up' })
    expect(s.cells.map((c) => c.id)).toEqual(['b', 'a'])

    const top = composerReducer(s, { type: 'move-cell', id: 'b', dir: 'up' })
    expect(top.cells.map((c) => c.id)).toEqual(['b', 'a']) // no-op at top
  })

  it('set-markdown updates the cell', () => {
    const s = composerReducer(initialComposerState(start), { type: 'set-markdown', id: 'c1', markdown: '# Edited' })
    expect(s.cells[0].kind === 'markdown' && s.cells[0].markdown).toBe('# Edited')
    expect(s.dirty).toBe(true)
  })

  it('set-dsl updates a query cell', () => {
    const withQuery = composerReducer(initialComposerState(start), { type: 'add-blank-query' })
    const queryId = withQuery.cells[1].id
    const s = composerReducer(withQuery, { type: 'set-dsl', id: queryId, dsl: 'SELECT 1' })
    const c = s.cells.find((x) => x.id === queryId)
    expect(c?.kind === 'query' && c.dsl).toBe('SELECT 1')
  })

  it('start-run/finish-run/fail-run track running and results', () => {
    const withQuery = composerReducer(initialComposerState(start), { type: 'add-blank-query' })
    const id = withQuery.cells[1].id

    const running = composerReducer(withQuery, { type: 'start-run', id })
    expect(running.running.has(id)).toBe(true)

    const finished = composerReducer(running, {
      type: 'finish-run', id, result: { columns: ['v'], rows: [{ v: 1 }], runtimeMs: 5 },
    })
    expect(finished.running.has(id)).toBe(false)
    expect(finished.results[id]).toBeDefined()

    const failed = composerReducer(running, { type: 'fail-run', id, error: 'boom' })
    expect(failed.running.has(id)).toBe(false)
    expect(failed.errors[id]).toBe('boom')
  })

  it('reset-from clears dirty and replaces cells', () => {
    const after = composerReducer(initialComposerState(start), { type: 'add-markdown' })
    expect(after.dirty).toBe(true)
    const reset = composerReducer(after, { type: 'reset-from', cells: start })
    expect(reset.dirty).toBe(false)
    expect(reset.cells).toEqual(start)
  })
})
