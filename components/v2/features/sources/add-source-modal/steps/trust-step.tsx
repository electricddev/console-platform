'use client'

import { Button } from '@/components/ui/button'
import { connectorById } from '../../catalog-data'
import { ModalActionBar } from '../modal-action-bar'

type Props = {
  connectorId: string
  accountId?: string
  onContinue: () => void
  onCancel: () => void
  stepIndicator?: string
}

export function TrustStep({ connectorId, onContinue, onCancel }: Props) {
  const def = connectorById(connectorId)
  const trust = def?.trust

  if (!trust) {
    return (
      <>
        <div className="flex-1 px-7 pt-7 pb-6">
          <p className="text-[13px] text-v2-muted">
            No trust copy available for this connector yet.
          </p>
        </div>
        <ModalActionBar
          left={
            <Button variant="link" size="sm" type="button" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground">
              Cancel
            </Button>
          }
          right={
            <Button size="sm" variant="brand" onClick={onContinue}>
              Continue →
            </Button>
          }
        />
      </>
    )
  }

  // Parse reads string: "charges, invoices, customers · last 24 months · read-only"
  const [itemsPart, ...qualifierParts] = trust.reads.split('·')
  const items = itemsPart
    ? itemsPart.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const qualifier = qualifierParts.map((s) => s.trim()).join(' · ')

  return (
    <>
      <div className="flex-1 px-7 pt-6 pb-4 overflow-y-auto">
        {/* Brief intro — smaller than before since header carries context */}
        <p className="max-w-[54ch] text-[14px] text-v2-foreground/80 leading-[1.65]">
          Hyve operates a confidential compute enclave built around your data.
          You retain ownership; Hyve gets read-only access scoped to the records
          below. Pause or disconnect at any moment.
        </p>

        {/* Data sheet */}
        <dl className="mt-5">
          {/* Reads row */}
          <div className="grid grid-cols-[110px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
              Reads
            </dt>
            <dd>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item}
                    className="font-mono text-[11.5px] bg-v2-foreground/[0.06] text-v2-foreground rounded-[4px] px-1.5 py-0.5"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {qualifier ? (
                <div className="mt-1.5 font-mono text-[11.5px] text-v2-muted">
                  — {qualifier}
                </div>
              ) : null}
            </dd>
          </div>

          {/* Storage row */}
          <div className="grid grid-cols-[110px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
              Storage
            </dt>
            <dd className="text-[13.5px] text-v2-foreground/85 leading-[1.55]">
              {trust.storage}
            </dd>
          </div>

          {/* Audit row */}
          <div className="grid grid-cols-[110px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
              Audit
            </dt>
            <dd className="text-[13.5px] text-v2-foreground/85 leading-[1.55]">
              {trust.audit}
            </dd>
          </div>

          {/* Revoke row */}
          <div className="grid grid-cols-[110px_1fr] gap-x-8 py-3.5 border-b border-v2-border/40">
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-v2-muted pt-0.5">
              Revoke
            </dt>
            <dd className="text-[13.5px] text-v2-foreground/85 leading-[1.55]">
              {trust.revoke}
            </dd>
          </div>
        </dl>
      </div>

      {/* Action bar — policy link on left beside Cancel */}
      <ModalActionBar
        left={
          <div className="flex items-center gap-4">
            <Button variant="link" size="sm" type="button" onClick={onCancel} className="text-v2-muted hover:text-v2-foreground px-0">
              Cancel
            </Button>
            <Button variant="link" size="sm" asChild className="px-0 text-v2-muted/60 hover:text-v2-muted text-[11.5px]">
              <a href="/legal/data-handling" target="_blank" rel="noopener noreferrer">
                Full data handling policy →
              </a>
            </Button>
          </div>
        }
        right={
          <Button size="sm" variant="brand" onClick={onContinue}>
            Continue →
          </Button>
        }
      />
    </>
  )
}
