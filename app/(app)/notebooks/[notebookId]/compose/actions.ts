'use server'

import { requireUser } from '@/lib/auth/server'
import { updateNotebookCells, getNotebook } from '@/lib/api/endpoints/notebooks'
import type { NotebookCell } from '@/lib/api/types'

export async function saveNotebookCellsAction(notebookId: string, cells: NotebookCell[]) {
  const session = await requireUser()
  const existing = await getNotebook({ user: session }, notebookId)
  if (existing.authorId !== session.id) {
    throw new Error('Not authorized to edit this notebook')
  }
  return updateNotebookCells({ user: session }, { id: notebookId, cells })
}
