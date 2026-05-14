import { notFound } from 'next/navigation'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { VaultStubPage } from '@/components/v2/features/vault-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VaultDataPage({ params }: PageProps) {
  const { id } = await params
  const vault = findVault(id)
  if (!vault) notFound()
  return (
    <VaultStubPage
      vault={vault}
      title="Data"
      description="The sealed data vault contents. What's actually stored and attested after ingestion. Each dataset: who submitted it, when it was sealed, ASC 820 class, attestation status."
    />
  )
}
