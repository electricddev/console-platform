import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/server'
import { getNotebook } from '@/lib/api/endpoints/notebooks'
import { PageHeader } from '@/components/common/page-header'
import { NotebookComposer } from '@/components/features/compose/notebook-composer'

export default async function ComposePage({ params }: { params: Promise<{ notebookId: string }> }) {
  const { notebookId } = await params
  const session = await requireUser()
  const notebook = await getNotebook({ user: session }, notebookId)
  if (notebook.authorId !== session.id) notFound()
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// compose" title={notebook.title} description={notebook.description} />
      <div className="mt-6">
        <Suspense fallback={null}>
          <NotebookComposer notebook={notebook} />
        </Suspense>
      </div>
    </div>
  )
}
