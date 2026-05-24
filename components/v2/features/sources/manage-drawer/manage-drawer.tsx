'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { pauseConnection, resumeConnection, removeConnection } from '@/app/(originator)/sources/actions'
import type { ConnectorConnection, ConnectionDataset, ConnectionStatus } from '@/lib/api/schemas'

const STATUS_DOT: Record<ConnectionStatus, string> = {
  ok: 'bg-v2-green',
  attention: 'bg-amber-500',
  error: 'bg-destructive',
  paused: 'bg-v2-muted/60',
}

type Props = {
  connection: ConnectorConnection | null
  datasets: readonly ConnectionDataset[]
  onClose: () => void
  onReconnect: (connectorId: string) => void
}

export function ManageDrawer({ connection, datasets, onClose, onReconnect }: Props) {
  const def = connection ? connectorById(connection.connectorId) : null
  const [confirmingRemove, setConfirmingRemove] = useState(false)

  return (
    <Sheet open={Boolean(connection)} onOpenChange={(o) => { if (!o) { setConfirmingRemove(false); onClose() } }}>
      <SheetContent side="right" className="w-[480px] max-w-[92vw] gap-0 p-0 sm:max-w-[480px]">
        {connection && def ? (
          <div className="flex h-full flex-col">
            <SheetTitle className="sr-only">{connection.name}</SheetTitle>
            <header className="border-b border-v2-border/60 p-6">
              <div className="flex items-start gap-3">
                {def.logo.kind === 'wordmark' ? (
                  <span aria-hidden="true" className={cn('flex size-10 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}>
                    {def.logo.label}
                  </span>
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-md bg-v2-surface-2"><def.logo.Icon className="size-5 text-v2-muted" strokeWidth={1.75} /></span>
                )}
                <div className="min-w-0">
                  <div className="font-serif text-[20px] font-normal text-v2-foreground">{connection.name}</div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-v2-muted">
                    {connection.subtitle ? <span className="font-mono">{connection.subtitle}</span> : null}
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className={cn('size-1.5 rounded-full', STATUS_DOT[connection.status])} />
                      <span>{connection.status === 'ok' ? 'healthy' : connection.status}</span>
                    </span>
                  </div>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6">
              <Section title="Health">
                <dl className="grid gap-0 divide-y divide-v2-border/60 border-t border-b border-v2-border/60">
                  <HealthRow k="Status" v={connection.status === 'ok' ? 'healthy' : connection.status} />
                  <HealthRow k="Datasets" v={String(datasets.length)} />
                  <HealthRow k="Cadence" v={connection.cadence} />
                  <HealthRow k="Last sync" v={new Date(connection.lastSyncAt).toLocaleString()} />
                </dl>
              </Section>

              <Section title="Datasets">
                <ul className="grid gap-1">
                  {datasets.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/datasets/${d.id}`}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-[12.5px] text-v2-foreground hover:bg-v2-foreground/[0.04]"
                      >
                        <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-1.5 rounded-full bg-v2-green" />{d.name}</span>
                        <span className="font-mono text-[11px] text-v2-muted">{d.rowCount.toLocaleString()} {d.rowUnit}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Credentials">
                <div className="text-[12.5px] text-v2-foreground">
                  {connection.connectorId === 'stripe' || connection.connectorId === 'plaid' || connection.connectorId === 'quickbooks' || connection.connectorId === 'xero'
                    ? `OAuth · ${connection.credentialsExpireAt ? `expires ${new Date(connection.credentialsExpireAt).toLocaleDateString()}` : 'refreshed recently'}`
                    : `Configured · ${connection.credentialsExpireAt ? `expires ${new Date(connection.credentialsExpireAt).toLocaleDateString()}` : 'no expiry'}`}
                </div>
              </Section>

              <Section title="Actions">
                {confirmingRemove ? (
                  <RemoveConfirm
                    connection={connection}
                    onCancel={() => setConfirmingRemove(false)}
                    onRemoved={() => { setConfirmingRemove(false); onClose() }}
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const res = connection.status === 'paused'
                          ? await resumeConnection(connection.id)
                          : await pauseConnection(connection.id)
                        if (res.ok) toast.success(connection.status === 'paused' ? 'Resumed' : 'Paused')
                        else toast.error(res.error)
                      }}
                    >
                      {connection.status === 'paused' ? 'Resume' : 'Pause'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => onReconnect(connection.connectorId)}>
                      Reconnect
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setConfirmingRemove(true)}>
                      Remove…
                    </Button>
                  </div>
                )}
              </Section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-v2-muted/70">{title}</h3>
      {children}
    </section>
  )
}

function HealthRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-3 py-2.5">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted">{k}</dt>
      <dd className="text-[12.5px] text-v2-foreground">{v}</dd>
    </div>
  )
}

function RemoveConfirm({ connection, onCancel, onRemoved }: { connection: ConnectorConnection; onCancel: () => void; onRemoved: () => void }) {
  const [value, setValue] = useState('')
  const match = value.trim() === connection.name
  return (
    <div className="rounded-md border border-v2-border/80 bg-v2-surface-2/50 p-3">
      <p className="text-[12.5px] text-v2-foreground">Remove {connection.name}?</p>
      <p className="mt-1 text-[11px] text-v2-muted">Datasets and bindings drop. Type the connection name to confirm.</p>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={connection.name}
        aria-label="Connection name to confirm removal"
        className="mt-2 w-full rounded-md border border-v2-border bg-v2-surface px-2 py-1.5 text-[12px] focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-v2-foreground"
      />
      <div className="mt-2 flex gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
        <Button
          variant="destructive"
          size="sm"
          type="button"
          disabled={!match}
          onClick={async () => {
            const result = await removeConnection(connection.id, value)
            if (result.ok) { toast.success('Removed'); onRemoved() }
            else toast.error(result.error)
          }}
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
