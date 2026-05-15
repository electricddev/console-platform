import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { findDataset } from '@/components/v2/features/vault-detail/data-fixture'
import { DatasetDetailPage } from '@/components/v2/features/vault-detail/dataset-detail-page'

interface PageProps {
  params: Promise<{ id: string; datasetId: string }>
}

export default async function VaultDatasetDetailPage({ params }: PageProps) {
  const { id, datasetId } = await params
  const vault = findVault(id)
  if (!vault) notFound()
  const dataset = findDataset(datasetId)
  if (!dataset) notFound()
  return (
    <Suspense>
      <DatasetDetailPage vault={vault} dataset={dataset} />
    </Suspense>
  )
}
