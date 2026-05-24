import { fixtures } from '@/lib/api/fixtures'
import { SourcesShell } from '@/components/v2/features/sources'

export const metadata = {
  title: 'Sources — Hyve',
}

export default function SourcesPage() {
  const { datasets } = fixtures.connectorCanvas
  return <SourcesShell connections={[]} datasets={datasets} />
}
