import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
}

export function ConnectedTab(_props: Props) {
  return <div className="text-[13px] text-v2-muted">Connected tab — coming in Task 9.</div>
}
