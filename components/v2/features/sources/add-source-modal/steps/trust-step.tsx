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

export function TrustStep({ connectorId, accountId, onContinue, onCancel, stepIndicator }: Props) {
  const def = connectorById(connectorId)
  const trust = def?.trust

  if (!trust) {
    return (
      <>
        <div className="flex-1 px-7 pt-9 pb-6">
          <p className="text-[13px] text-v2-muted">
            No trust copy available for this connector yet.
          </p>
        </div>
        <ModalActionBar
          left={
            <Button variant="link" size="sm" type="button" onClick={onCancel}>
              Cancel
            </Button>
          }
          right={
            <Button size="sm" variant="brand" onClick={onContinue}>
              Continue →
            </Button>
          }
          stepIndicator={stepIndicator}
        />
      </>
    )
  }

  // Parse the trust.reads string to extract individual dataset identifiers.
  // Format: "charges, invoices, customers, refunds, subscriptions · last 24 months · read-only"
  const [itemsPart, ...qualifierParts] = trust.reads.split('·')
  const items = itemsPart
    ? itemsPart.split(',').map((s) => s.trim()).filter(Boolean)
    : []
  const qualifier = qualifierParts.map((s) => s.trim()).join(' · ')

  const providerName = def?.name ?? connectorId

  return (
    <>
      {/* Stage — essay + data sheet */}
      <div className="flex-1 px-7 pt-9 pb-4 overflow-y-auto">
        {/* Mono kicker */}
        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-v2-muted/70">
          Connection terms
        </div>

        {/* Serif headline */}
        <h2 className="mt-2 font-serif text-[32px] font-normal leading-[1.05] tracking-[-0.012em] text-v2-foreground">
          What Hyve will do with your {providerName} data.
        </h2>

        {/* Lead paragraph — introduces spirit of the agreement */}
        <p className="mt-3 max-w-[58ch] text-[14px] text-v2-foreground/85 leading-[1.65]">
          Hyve operates a confidential compute enclave built around your data.
          You retain ownership; Hyve gets read-only access scoped to the records
          below. Pause or disconnect at any moment.
        </p>

        {/* Data sheet */}
        <dl className="mt-6">
          {/* Reads row */}
          <div className="grid grid-cols-[120px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
            <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
              Reads
            </dt>
            <dd>
              <div className="flex flex-wrap gap-1.5">
                {items.map((item) => (
                  <span
                    key={item}
                    className="font-mono text-[12px] bg-v2-foreground/[0.08] text-v2-foreground rounded-[3px] px-1.5 py-0.5"
                  >
                    {item}
                  </span>
                ))}
              </div>
              {qualifier ? (
                <div className="mt-1.5 font-mono text-[12px] text-v2-muted">
                  — {qualifier}
                </div>
              ) : null}
            </dd>
          </div>

          {/* Storage row */}
          <div className="grid grid-cols-[120px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
            <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
              Storage
            </dt>
            <dd className="text-[14px] text-v2-foreground/90 leading-[1.55]">
              {trust.storage}
            </dd>
          </div>

          {/* Audit row */}
          <div className="grid grid-cols-[120px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
            <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
              Audit
            </dt>
            <dd className="text-[14px] text-v2-foreground/90 leading-[1.55]">
              {trust.audit}
            </dd>
          </div>

          {/* Revoke row */}
          <div className="grid grid-cols-[120px_1fr] gap-x-8 py-4 border-b border-v2-border/40">
            <dt className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-v2-muted pt-0.5">
              Revoke
            </dt>
            <dd className="text-[14px] text-v2-foreground/90 leading-[1.55]">
              {trust.revoke}
            </dd>
          </div>
        </dl>

        {/* Policy link */}
        <div className="mt-4">
          <Button variant="link" size="sm" asChild className="px-0 text-v2-muted/70 hover:text-v2-foreground">
            <a href="/legal/data-handling" target="_blank" rel="noopener noreferrer">
              Full data handling policy →
            </a>
          </Button>
        </div>
      </div>

      {/* Action bar */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
        }
        right={
          <Button size="sm" variant="brand" onClick={onContinue}>
            Continue →
          </Button>
        }
        stepIndicator={stepIndicator}
      />
    </>
  )
}
