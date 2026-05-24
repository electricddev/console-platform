import type { ConnectorConnection } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
}

export function CatalogueTab(_props: Props) {
  return <div className="text-[13px] text-v2-muted">Catalogue tab — coming in Task 11.</div>
}
