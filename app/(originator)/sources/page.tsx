import { fixtures } from '@/lib/api/fixtures'
import { SourcesCanvas } from '@/components/v2/features/sources'

export const metadata = {
  title: 'Connections — Hyve',
}

export default function SourcesPage() {
  const { connections, datasets, vaults } = fixtures.connectorCanvas
  return (
    <SourcesCanvas
      connections={connections}
      datasets={datasets}
      vaults={vaults}
    />
  )
}
