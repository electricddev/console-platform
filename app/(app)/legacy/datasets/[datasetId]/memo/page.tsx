import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getActiveMemo } from '@/lib/api/endpoints/memos'
import { getAcredBriefRedFlags } from '@/lib/api/endpoints/datasets'
import { MemoEditor } from '@/components/features/memo/memo-editor'

export default async function MemoPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  if (datasetId !== 'ds_acred') notFound()
  const session = await requireUser()
  const [memo, redFlags] = await Promise.all([
    getActiveMemo({ user: session }, datasetId),
    getAcredBriefRedFlags({ user: session }, { includeAcknowledged: true }),
  ])
  return <MemoEditor memo={memo} redFlags={redFlags} userRole={session.role} />
}
