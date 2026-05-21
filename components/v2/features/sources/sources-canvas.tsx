'use client'

import type { ConnectorConnection, ConnectionDataset, VaultRef } from '@/lib/api/schemas'

type Props = {
  connections: readonly ConnectorConnection[]
  datasets: readonly ConnectionDataset[]
  vaults: readonly VaultRef[]
}

export function SourcesCanvas({ connections, datasets, vaults }: Props) {
  return (
    <div className="px-8 pt-6 pb-12">
      <header className="flex items-end justify-between gap-6 border-b border-v2-border/60 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
            {'// pipeline · sources'}
          </p>
          <h1 className="mt-1 text-[26px] font-semibold leading-tight tracking-tight text-v2-foreground">
            Connections
          </h1>
          <p className="mt-1 max-w-prose text-sm text-v2-muted">
            {connections.length} sources feeding {datasets.length} datasets into {vaults.length} data vaults.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-v2-foreground px-4 py-2 text-sm font-medium text-v2-background hover:bg-v2-foreground/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          + Add connector
        </button>
      </header>
      {/* Canvas appears below — added in Task C5 */}
      <div className="mt-8 text-xs text-v2-muted">Canvas pending — items rendered in Task C5.</div>
    </div>
  )
}
