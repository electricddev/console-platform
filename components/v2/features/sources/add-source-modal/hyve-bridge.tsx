'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ModalActionBar } from './modal-action-bar'

type Props = {
  connectorId: string
  onApprove: (accountId: string) => void
  onDeny: () => void
  stepIndicator?: string
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
  const scopes = SCOPES[connectorId] ?? { reads: [], cannot: [] }
  const accountId = ACCOUNT_IDS[connectorId] ?? '—'

  return (
    <>
      {/* Scope content — lives directly on modal surface, no nested card */}
      <div className="flex-1 px-7 pt-6 pb-4">
        {/* Clear single-line authorization ask */}
        <p className="text-[14px] text-v2-foreground/80 leading-[1.65] max-w-[48ch]">
          Grant Hyve read-only access to this account. Hyve will never move money
          or modify records.
        </p>

        {/* Two-column scope comparison */}
        <div className="mt-6 grid grid-cols-2 divide-x divide-v2-border/40">
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

      {/* Action bar */}
      <ModalActionBar
        left={
          <Button variant="link" size="sm" onClick={onDeny} className="px-0 text-v2-muted hover:text-v2-foreground">
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
    <div className={cn(variant === 'cannot' ? 'pl-6' : 'pr-6')}>
      <div className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-v2-muted mb-3">
        {kicker}
      </div>
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={r} className="flex items-start gap-2 text-[13px]">
            <span
              aria-hidden="true"
              className={cn(
                'mt-[6px] size-1 rounded-full shrink-0',
                variant === 'reads'
                  ? 'bg-v2-foreground/50'
                  : 'bg-v2-muted/35',
              )}
            />
            <span
              className={
                variant === 'reads'
                  ? 'text-v2-foreground'
                  : 'line-through decoration-v2-muted/30 text-v2-muted'
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
