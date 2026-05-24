'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { connectorById, WORDMARK_TONES } from '../../catalog-data'
import { ModalActionBar } from '../modal-action-bar'

type Props = {
  connectorId: string
  accountId?: string
  onContinue: () => void
  onCancel: () => void
}

export function TrustStep({ connectorId, accountId, onContinue, onCancel }: Props) {
  const def = connectorById(connectorId)
  const trust = def?.trust

  if (!trust) {
    return (
      <>
        <div className="px-6 pt-7 pb-2">
          <p className="text-[12.5px] text-v2-muted">
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

  return (
    <>
      {/* Stage */}
      <div className="px-6 pt-7 pb-4">
        {/* Eyebrow */}
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-v2-muted/60">
          Terms of the connection
        </div>

        {/* Provider context inline */}
        <div className="mt-1 flex items-center gap-2">
          {def?.logo.kind === 'wordmark' ? (
            <span
              aria-hidden="true"
              className={cn(
                'flex size-6 items-center justify-center rounded-[4px] font-mono text-[9px] font-semibold shrink-0',
                WORDMARK_TONES[def.logo.tone],
              )}
            >
              {def.logo.label}
            </span>
          ) : def?.logo.kind === 'icon' ? (
            <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-v2-surface-2">
              <def.logo.Icon className="size-3.5 text-v2-muted" strokeWidth={1.75} />
            </span>
          ) : null}
          <span className="font-mono text-[11.5px] text-v2-muted">
            {def?.name ?? connectorId}
            {accountId ? ` · ${accountId}` : null}
          </span>
        </div>

        {/* Headline */}
        <h2 className="mt-3 font-serif text-[26px] leading-[1.15] tracking-[-0.012em] text-v2-foreground">
          What Hyve will do with your {def?.name} data.
        </h2>
        <p className="mt-1.5 max-w-[420px] text-[12.5px] text-v2-muted">
          You&rsquo;re granting Hyve read access. Here&rsquo;s exactly what that means.
        </p>

        {/* Clause rows */}
        <div className="mt-7">
          <TrustRow index="01" keyLabel="Reads">
            {/* Render each identifier as a pill, then qualifier on a new line */}
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span
                  key={item}
                  className="rounded-[3px] bg-v2-foreground/[0.10] font-mono text-[11.5px] px-1.5 py-0.5 text-v2-foreground/90"
                >
                  {item}
                </span>
              ))}
            </div>
            {qualifier ? (
              <div className="mt-1.5 font-mono text-[10.5px] text-v2-muted/70">
                {qualifier}
              </div>
            ) : null}
          </TrustRow>

          <TrustRow index="02" keyLabel="Storage">
            <span className="text-[13px] text-v2-foreground/90 leading-relaxed">
              {trust.storage}
            </span>
          </TrustRow>

          <TrustRow index="03" keyLabel="Audit">
            <span className="text-[13px] text-v2-foreground/90 leading-relaxed">
              {trust.audit}
            </span>
          </TrustRow>

          <TrustRow index="04" keyLabel="Revoke" isLast>
            <span className="text-[13px] text-v2-foreground/90 leading-relaxed">
              {trust.revoke}
            </span>
          </TrustRow>
        </div>
      </div>

      {/* Action bar */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" asChild>
            <a href="/legal/data-handling" target="_blank" rel="noopener noreferrer">
              Full data handling policy
            </a>
          </Button>
        }
        right={
          <>
            <Button variant="outline" size="sm" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" variant="brand" onClick={onContinue}>
              Continue →
            </Button>
          </>
        }
      />
    </>
  )
}

function TrustRow({
  index,
  keyLabel,
  children,
  isLast = false,
}: {
  index: string
  keyLabel: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div
      className={cn(
        'grid grid-cols-[44px_1fr] gap-x-5 gap-y-0.5 py-4',
        !isLast && 'border-b border-v2-border/40',
      )}
    >
      <div className="font-mono text-[10.5px] tracking-[0.06em] text-v2-muted/80 pt-0.5">
        {index} / {keyLabel}
      </div>
      <div>{children}</div>
    </div>
  )
}
