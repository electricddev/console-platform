'use client'

import Link from 'next/link'
import type { ConnectorConnection, ConnectionDataset } from '@/lib/api/schemas'

function fmtRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}

function fmtRowCount(n: number, unit: string): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M ${unit}`
  if (n >= 1_000) return `${Math.round(n / 1_000)}K ${unit}`
  return `${n} ${unit}`
}

type Props = {
  connection: ConnectorConnection
  datasets: readonly ConnectionDataset[]
}

export function InspectorContent({ connection, datasets }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">Health</h3>
        <p className="mt-1 text-[12.5px] text-v2-foreground">
          Connected · {datasets.length} dataset{datasets.length === 1 ? '' : 's'} · synced{' '}
          {fmtRelative(connection.lastSyncAt)} · cadence: {connection.cadence}
        </p>
        {connection.credentialsExpireAt ? (
          <p className="mt-1 text-[11.5px] text-[oklch(0.55_0.14_70)]">
            Credentials expire {fmtRelative(connection.credentialsExpireAt)}
          </p>
        ) : null}
        {connection.errorMessage ? (
          <p className="mt-1 text-[11.5px] text-[oklch(0.55_0.18_25)]">{connection.errorMessage}</p>
        ) : null}
      </section>

      <section>
        <h3 className="text-[10px] font-medium uppercase tracking-[0.14em] text-v2-muted/70">Datasets</h3>
        <ul className="mt-1.5 grid gap-1">
          {datasets.map((d) => (
            <li key={d.id}>
              <Link
                href={`/datasets/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12px] text-v2-foreground transition-colors hover:bg-v2-foreground/[0.04]"
              >
                <span className="font-medium">{d.name}</span>
                <span className="font-mono text-[10.5px] tabular-nums text-v2-muted">
                  {fmtRowCount(d.rowCount, d.rowUnit)} · {fmtRelative(d.lastSyncAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
