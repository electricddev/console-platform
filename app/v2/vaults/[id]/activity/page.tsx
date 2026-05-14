import { notFound } from 'next/navigation'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { VaultStubPage } from '@/components/v2/features/vault-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VaultActivityPage({ params }: PageProps) {
  const { id } = await params
  const vault = findVault(id)
  if (!vault) notFound()
  return (
    <VaultStubPage
      vault={vault}
      title="Activity"
      description="What's been queried and what happened. Data events and query events in one continuous feed — counterparty pulls, source ingestions, schema validations, access decisions."
    />
  )
}
