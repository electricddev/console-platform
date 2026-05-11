import type { Methodology, CellResult } from '@/lib/data/methodology'
import type { NotebookCell } from '@/lib/api/types'

export type ComposerState = {
  cells: NotebookCell[]
  dirty: boolean
  running: Set<string>
  results: Record<string, CellResult | undefined>
  errors: Record<string, string | undefined>
}

export type ComposerAction =
  | { type: 'add-methodology'; methodology: Methodology }
  | { type: 'add-markdown' }
  | { type: 'add-blank-query' }
  | { type: 'remove-cell'; id: string }
  | { type: 'move-cell'; id: string; dir: 'up' | 'down' }
  | { type: 'set-markdown'; id: string; markdown: string }
  | { type: 'set-dsl'; id: string; dsl: string }
  | { type: 'start-run'; id: string }
  | { type: 'finish-run'; id: string; result: CellResult }
  | { type: 'fail-run'; id: string; error: string }
  | { type: 'reset-from'; cells: NotebookCell[] }

export function initialComposerState(cells: NotebookCell[]): ComposerState {
  return { cells, dirty: false, running: new Set(), results: {}, errors: {} }
}

let cellCounter = 0
function newCellId(): string {
  cellCounter += 1
  return `c_${Date.now().toString(36)}_${cellCounter}`
}

export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  switch (action.type) {
    case 'add-methodology': {
      const m = action.methodology
      const cell: NotebookCell = {
        id: newCellId(),
        kind: 'query',
        dsl: m.dsl,
        parameters: {},
        methodologyId: m.id,
        renderShape: m.shape,
      }
      return { ...state, cells: [...state.cells, cell], dirty: true }
    }
    case 'add-markdown': {
      const cell: NotebookCell = { id: newCellId(), kind: 'markdown', markdown: '' }
      return { ...state, cells: [...state.cells, cell], dirty: true }
    }
    case 'add-blank-query': {
      const cell: NotebookCell = {
        id: newCellId(),
        kind: 'query',
        dsl: '',
        parameters: {},
        renderShape: 'table',
      }
      return { ...state, cells: [...state.cells, cell], dirty: true }
    }
    case 'remove-cell':
      return { ...state, cells: state.cells.filter((c) => c.id !== action.id), dirty: true }
    case 'move-cell': {
      const idx = state.cells.findIndex((c) => c.id === action.id)
      if (idx < 0) return state
      const target = action.dir === 'up' ? idx - 1 : idx + 1
      if (target < 0 || target >= state.cells.length) return state
      const next = state.cells.slice()
      const [moved] = next.splice(idx, 1)
      next.splice(target, 0, moved)
      return { ...state, cells: next, dirty: true }
    }
    case 'set-markdown':
      return {
        ...state,
        cells: state.cells.map((c) =>
          c.id === action.id && c.kind === 'markdown' ? { ...c, markdown: action.markdown } : c,
        ),
        dirty: true,
      }
    case 'set-dsl':
      return {
        ...state,
        cells: state.cells.map((c) =>
          c.id === action.id && c.kind === 'query' ? { ...c, dsl: action.dsl } : c,
        ),
        dirty: true,
      }
    case 'start-run': {
      const running = new Set(state.running)
      running.add(action.id)
      const errors = { ...state.errors }
      delete errors[action.id]
      return { ...state, running, errors }
    }
    case 'finish-run': {
      const running = new Set(state.running)
      running.delete(action.id)
      return { ...state, running, results: { ...state.results, [action.id]: action.result } }
    }
    case 'fail-run': {
      const running = new Set(state.running)
      running.delete(action.id)
      return { ...state, running, errors: { ...state.errors, [action.id]: action.error } }
    }
    case 'reset-from':
      return { cells: action.cells, dirty: false, running: new Set(), results: {}, errors: {} }
  }
}
