import { notFound } from 'next/navigation'
import { findVault } from '@/components/v2/features/origination/origination-fixture'
import { VaultStubPage } from '@/components/v2/features/vault-detail'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VaultSettingsPage({ params }: PageProps) {
  const { id } = await params
  const vault = findVault(id)
  if (!vault) notFound()
  return (
    <VaultStubPage
      vault={vault}
      title="Settings"
      description="Data vault keys, multisig signers, output channels for on-chain delivery, team members. Configuration that doesn't change often."
    />
  )
}
