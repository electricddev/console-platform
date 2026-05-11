'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth/server'
import { updateNotebookCells, getNotebook } from '@/lib/api/endpoints/notebooks'
import { NotebookCellSchema } from '@/lib/api/schemas'

const CellsInputSchema = z.array(NotebookCellSchema)

export async function saveNotebookCellsAction(notebookId: string, cells: unknown) {
  const session = await requireUser()
  const parsed = CellsInputSchema.safeParse(cells)
  if (!parsed.success) {
    throw new Error('Invalid cells: ' + parsed.error.issues.map((i) => i.message).join(', '))
  }
  const existing = await getNotebook({ user: session }, notebookId)
  if (existing.authorId !== session.id) {
    throw new Error('Not authorized to edit this notebook')
  }
  return updateNotebookCells({ user: session }, { id: notebookId, cells: parsed.data })
}
