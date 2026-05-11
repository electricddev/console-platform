'use client'

import type { Dispatch } from 'react'
import type { NotebookCell } from '@/lib/api/types'
import { acredMethodology } from '@/lib/data/acred/methodology'
import type { ComposerAction, ComposerState } from './composer-reducer'
import { ComposeCellShell } from './compose-cell-shell'
import { CellMarkdownEditor } from './cell-markdown-editor'
import { CellQueryEditor } from './cell-query-editor'

type Props = {
  state: ComposerState
  dispatch: Dispatch<ComposerAction>
}

function titleFor(cell: NotebookCell): { title: string; subtitle?: string } {
  if (cell.kind === 'markdown') return { title: 'Markdown' }
  if (cell.kind === 'query') {
    if (cell.methodologyId) {
      const m = acredMethodology.find((x) => x.id === cell.methodologyId)
      if (m) return { title: m.title, subtitle: m.description }
      return { title: 'Custom query', subtitle: `(unknown methodology: ${cell.methodologyId})` }
    }
    return { title: 'Custom query' }
  }
  return { title: cell.kind }
}

export function ComposeCellList({ state, dispatch }: Props) {
  if (state.cells.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border bg-surface/20 p-6 text-center text-sm text-muted-foreground">
        Pick a methodology entry or add a markdown / custom query cell.
      </p>
    )
  }

  return (
    <div className="grid gap-3">
      {state.cells.map((cell) => {
        const { title, subtitle } = titleFor(cell)
        return (
          <ComposeCellShell
            key={cell.id}
            title={title}
            subtitle={subtitle}
            onMoveUp={() => dispatch({ type: 'move-cell', id: cell.id, dir: 'up' })}
            onMoveDown={() => dispatch({ type: 'move-cell', id: cell.id, dir: 'down' })}
            onRemove={() => dispatch({ type: 'remove-cell', id: cell.id })}
          >
            {cell.kind === 'markdown' && (
              <CellMarkdownEditor
                value={cell.markdown}
                onChange={(v) => dispatch({ type: 'set-markdown', id: cell.id, markdown: v })}
              />
            )}
            {cell.kind === 'query' && (
              <CellQueryEditor
                cell={cell}
                state={state}
                dispatch={dispatch}
              />
            )}
            {cell.kind !== 'markdown' && cell.kind !== 'query' && (
              <p className="text-xs text-muted-foreground">Unsupported cell kind: {cell.kind}.</p>
            )}
          </ComposeCellShell>
        )
      })}
    </div>
  )
}
