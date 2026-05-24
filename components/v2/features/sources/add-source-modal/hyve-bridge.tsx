'use client'

import { connectorById, WORDMARK_TONES } from '../catalog-data'
import { Button } from '@/components/ui/button'
import { ModalActionBar } from './modal-action-bar'
import { cn } from '@/lib/utils'

type Props = {
  connectorId: string
  onApprove: (accountId: string) => void
  onDeny: () => void
}

// Plausible-looking account ids per provider, for the mocked flow only.
const ACCOUNT_IDS: Record<string, string> = {
  stripe: 'acct_1Hyve24',
  plaid: 'item_HyveCreditFacility',
  quickbooks: 'realm_4620816365',
  xero: 'tenant_8f3a7b21',
}

// "Reads" / "Cannot" lists per provider
const SCOPES: Record<string, { reads: string[]; cannot: string[] }> = {
  stripe: {
    reads: ['Charges', 'Invoices', 'Customers', 'Refunds', 'Subscriptions'],
    cannot: ['Move money', 'Modify any record', 'Access API keys'],
  },
  plaid: {
    reads: ['Transactions', 'Balances', 'Accounts'],
    cannot: ['Move money', 'Initiate transfers', 'Read credentials'],
  },
  quickbooks: {
    reads: ['Invoices', 'Expenses', 'Journal entries', 'Customers', 'Vendors'],
    cannot: ['Modify records', 'Post journal entries', 'Pay invoices'],
  },
  xero: {
    reads: ['Invoices', 'Expenses', 'Journal entries', 'Contacts'],
    cannot: ['Modify records', 'Post entries', 'Pay invoices'],
  },
}

export function HyveBridge({ connectorId, onApprove, onDeny }: Props) {
  const def = connectorById(connectorId)
  const scopes = SCOPES[connectorId] ?? { reads: [], cannot: [] }
  const accountId = ACCOUNT_IDS[connectorId] ?? '—'

  return (
    <>
      {/* Stage — the authorisation surface */}
      <div className="px-6 pt-5 pb-2">
        <div className="rounded-lg border border-v2-border/60 bg-v2-surface-2/40 p-5">
          {/* Provider chip */}
          <div className="flex items-center gap-3 mb-5">
            {def?.logo.kind === 'wordmark' ? (
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-9 items-center justify-center rounded-md font-mono text-[12px] font-semibold shrink-0',
                  WORDMARK_TONES[def.logo.tone],
                )}
              >
                {def.logo.label}
              </span>
            ) : null}
            <div>
              <div className="text-[13px] font-semibold text-v2-foreground">
                {def?.name}
              </div>
              <div className="mt-0.5 font-mono text-[11px] text-v2-muted">
                {accountId}
              </div>
            </div>
          </div>

          {/* Heading */}
          <h2 className="font-serif text-[20px] font-normal leading-tight tracking-tight text-v2-foreground">
            Authorize Hyve to read this {def?.name} account.
          </h2>

          {/* Two-column scope layout */}
          <div className="mt-5 grid grid-cols-2 gap-6">
            <ScopeColumn
              kicker="Hyve will read"
              items={scopes.reads}
              variant="reads"
            />
            <ScopeColumn
              kicker="Hyve will not"
              items={scopes.cannot}
              variant="cannot"
            />
          </div>
        </div>
      </div>

      {/* Action bar: Back link | Deny + Approve */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onDeny} className="px-0">
            ← Back to setup
          </Button>
        }
        right={
          <>
            <Button variant="outline" size="sm" onClick={onDeny}>
              Deny
            </Button>
            <Button
              autoFocus
              size="sm"
              onClick={() => onApprove(accountId)}
              variant="brand"
            >
              Approve →
            </Button>
          </>
        }
      />
    </>
  )
}

function ScopeColumn({
  kicker,
  items,
  variant,
}: {
  kicker: string
  items: string[]
  variant: 'reads' | 'cannot'
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted mb-2">
        {kicker}
      </div>
      <ul className="space-y-1.5">
        {items.map((r) => (
          <li key={r} className="flex items-start gap-2 text-[12.5px]">
            <span
              aria-hidden="true"
              className={cn(
                'mt-[5px] size-1 rounded-full shrink-0',
                variant === 'reads'
                  ? 'bg-v2-foreground/50'
                  : 'bg-v2-foreground/25',
              )}
            />
            <span
              className={
                variant === 'reads'
                  ? 'text-v2-foreground'
                  : 'text-v2-foreground/75'
              }
            >
              {r}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
