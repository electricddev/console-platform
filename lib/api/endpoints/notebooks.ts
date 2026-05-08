import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { NotebookSchema } from '@/lib/api/schemas'
import type { Notebook, NotebookCell } from '@/lib/api/types'

const state: Notebook[] = fixtures.notebooks.map((n) => ({ ...n, cells: n.cells.map((c) => ({ ...c })) }))

export const listNotebooks = mockEndpoint(
  async (): Promise<Notebook[]> => state.map((n) => NotebookSchema.parse(n)),
  { latencyMs: 140 }
)

export const getNotebook = mockEndpoint(
  async (_ctx: RequestContext, _signal, id: string): Promise<Notebook> => {
    const n = state.find((x) => x.id === id)
    if (!n) throw new MockApiError('Notebook not found', 404)
    return NotebookSchema.parse(n)
  },
  { latencyMs: 120 }
)

export const createNotebook = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { title: string; description?: string }): Promise<Notebook> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'nb_' + Math.random().toString(36).slice(2, 8)
    const n: Notebook = {
      id, title: input.title, description: input.description,
      authorId: ctx.user.id, authorOrgId: ctx.user.orgId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      cells: [{ id: 'c1', kind: 'markdown', markdown: '# ' + input.title }],
    }
    state.unshift(n)
    return NotebookSchema.parse(n)
  },
  { latencyMs: 200 }
)

export const updateNotebookCells = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { id: string; cells: NotebookCell[] }) => {
    const n = state.find((x) => x.id === input.id)
    if (!n) throw new MockApiError('Notebook not found', 404)
    n.cells = input.cells
    n.updatedAt = new Date().toISOString()
    return NotebookSchema.parse(n)
  },
  { latencyMs: 200 }
)
