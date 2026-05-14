import { notFound } from 'next/navigation'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { VaultStubPage } from '@/components/v2/features/vault-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VaultQueriesPage({ params }: PageProps) {
  const { id } = await params
  const vault = findVault(id)
  if (!vault) notFound()
  return (
    <VaultStubPage
      vault={vault}
      title="Queries"
      description="Approved computation patterns against this data vault. NAV computation, concentration check, advance rate, non-accrual flag — plus custom queries proposed by collaborators and approved by the fund. Oracle delivery is configured per query."
    />
  )
}
