import { requireUser } from '@/lib/auth/server'
import { getNotebook } from '@/lib/api/endpoints/notebooks'
import { PageHeader } from '@/components/common/page-header'
import { CellMarkdown } from '@/components/features/notebooks/cell-markdown'
import { CellQuery } from '@/components/features/notebooks/cell-query'
import { CellVisualization } from '@/components/features/notebooks/cell-visualization'
import { CellAttestation } from '@/components/features/notebooks/cell-attestation'

export default async function NotebookDetail({ params }: { params: Promise<{ notebookId: string }> }) {
  const { notebookId } = await params
  const session = await requireUser()
  const n = await getNotebook({ user: session }, notebookId)
  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader eyebrow="// notebook" title={n.title} description={n.description} />
      <div className="mt-6 grid gap-6">
        {n.cells.map((c) => {
          if (c.kind === 'markdown') return <CellMarkdown key={c.id} markdown={c.markdown} />
          if (c.kind === 'query') return <CellQuery key={c.id} dsl={c.dsl} runId={c.runId} />
          if (c.kind === 'visualization') return <CellVisualization key={c.id} runId={c.runId} shape={c.shape === 'distribution' ? 'bar' : c.shape} />
          if (c.kind === 'attestation') return <CellAttestation key={c.id} runIds={c.runIds} />
          return null
        })}
      </div>
    </div>
  )
}
