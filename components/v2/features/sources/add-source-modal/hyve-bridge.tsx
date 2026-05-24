'use client'

import { connectorById, WORDMARK_TONES } from '../catalog-data'
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

// "Reads" / "Cannot" lists per provider — copied/derived from catalog-data.ts trust.reads.
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
    <div className="rounded-lg border border-v2-foreground/30 bg-v2-surface p-5 shadow-2xl shadow-black/20">
      <button
        type="button"
        onClick={onDeny}
        className="mb-3 text-[11.5px] text-v2-muted transition-colors hover:text-v2-foreground"
      >
        ← Back to setup
      </button>

      <div className="flex items-center gap-3">
        {def?.logo.kind === 'wordmark' ? (
          <span aria-hidden="true" className={cn('flex size-9 items-center justify-center rounded-md font-mono text-[12px] font-semibold', WORDMARK_TONES[def.logo.tone])}>
            {def.logo.label}
          </span>
        ) : null}
        <div>
          <div className="text-[13px] font-semibold text-v2-foreground">{def?.name}</div>
          <div className="mt-0.5 font-mono text-[11px] text-v2-muted">{accountId}</div>
        </div>
      </div>

      <h2 className="font-serif text-[19px] font-normal leading-tight tracking-tight text-v2-foreground mt-5">
        Authorize Hyve to read this {def?.name} account.
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted mb-1.5">Hyve will be able to read</div>
          <ul className="space-y-1">
            {scopes.reads.map((r) => (
              <li key={r} className="flex items-center gap-2 text-[12.5px] text-v2-foreground">
                <span aria-hidden="true" className="size-1 rounded-full bg-v2-foreground/40 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-v2-muted mb-1.5">Hyve will not be able to</div>
          <ul className="space-y-1">
            {scopes.cannot.map((r) => (
              <li key={r} className="flex items-center gap-2 text-[12.5px] text-v2-foreground/85">
                <span aria-hidden="true" className="size-1 rounded-full bg-v2-foreground/30 shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onDeny}
          className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          Deny
        </button>
        <button
          type="button"
          onClick={() => onApprove(accountId)}
          autoFocus
          className="rounded-md bg-v2-green px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-v2-green-hover hover:shadow-[0_4px_18px_-8px_oklch(0.40_0.10_160_/_0.5)] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
        >
          Approve →
        </button>
      </div>
    </div>
  )
}
