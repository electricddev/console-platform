import { notFound } from 'next/navigation'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { VaultStubPage } from '@/components/v2/features/vault-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VaultAccessPage({ params }: PageProps) {
  const { id } = await params
  const vault = findVault(id)
  if (!vault) notFound()
  return (
    <VaultStubPage
      vault={vault}
      title="Access"
      description="Counterparties granted data vault access. Gauntlet (execute, 200/day, active), Morpho (read, NAV feed), Aave V4 (pending). Permissions are scoped, capped, and revocable in one click."
    />
  )
}
