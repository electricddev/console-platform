'use client'

import { useReducer, useState } from 'react'
import type { Notebook } from '@/lib/api/types'
import { saveNotebookCellsAction } from '@/app/(app)/notebooks/[notebookId]/compose/actions'
import { composerReducer, initialComposerState } from './composer-reducer'
import { MethodologySidebar } from './methodology-sidebar'
import { ComposeCellList } from './compose-cell-list'
import { SaveBar } from './save-bar'

type Props = { notebook: Notebook }

export function NotebookComposer({ notebook }: Props) {
  const [state, dispatch] = useReducer(composerReducer, initialComposerState(notebook.cells))
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await saveNotebookCellsAction(notebook.id, state.cells)
      dispatch({ type: 'reset-from', cells: state.cells })
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
      <MethodologySidebar
        onAddMethodology={(m) => dispatch({ type: 'add-methodology', methodology: m })}
        onAddMarkdown={() => dispatch({ type: 'add-markdown' })}
        onAddBlankQuery={() => dispatch({ type: 'add-blank-query' })}
      />
      <main className="grid gap-3">
        <SaveBar notebookId={notebook.id} dirty={state.dirty} saving={saving} onSave={handleSave} />
        {saveError && <p className="text-xs text-destructive">Save failed: {saveError}</p>}
        <ComposeCellList state={state} dispatch={dispatch} />
      </main>
    </div>
  )
}
