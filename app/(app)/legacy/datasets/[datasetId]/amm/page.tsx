import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getAcredAmmFeed } from '@/lib/api/endpoints/datasets'
import { AmmOpsPanel } from '@/components/features/amm/amm-ops-panel'

export default async function AmmPage({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  if (datasetId !== 'ds_acred') notFound()
  const session = await requireUser()
  const feed = await getAcredAmmFeed({ user: session })
  return <AmmOpsPanel initial={feed} />
}
