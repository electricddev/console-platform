import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getDataset } from '@/lib/api/endpoints/datasets'
import { getTablesForDataset } from '@/lib/data/registry'
import { DatasetExplorer } from '@/components/features/explore/dataset-explorer'

export default async function ExploreTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const ds = await getDataset({ user: session }, datasetId)
  if (!ds.tables || ds.tables.length === 0) notFound()
  const tables = getTablesForDataset(datasetId)
  if (!tables) notFound()
  return <DatasetExplorer datasetId={datasetId} tables={tables} />
}
