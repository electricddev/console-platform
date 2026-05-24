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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hyve-bridge-title"
      className="rounded-lg border border-v2-foreground/30 bg-v2-surface p-5 shadow-2xl shadow-black/20"
    >
      <div className="flex items-center justify-between border-b border-v2-border/60 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-v2-muted">Hyve Bridge</span>
      </div>

      <div className="mt-4 flex items-center gap-3">
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

      <h2 id="hyve-bridge-title" className="mt-4 font-serif text-[18px] font-normal leading-tight text-v2-foreground">
        Authorize Hyve to read this {def?.name} account.
      </h2>

      <div className="mt-4 flex flex-col gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-v2-muted">Hyve will be able to read</div>
          <ul className="mt-1.5 flex flex-col gap-0.5 text-[12.5px] text-v2-foreground">
            {scopes.reads.map((r) => <li key={r}>· {r}</li>)}
          </ul>
        </div>
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-v2-muted">Hyve will not be able to</div>
          <ul className="mt-1.5 flex flex-col gap-0.5 text-[12.5px] text-v2-foreground/85">
            {scopes.cannot.map((r) => <li key={r}>· {r}</li>)}
          </ul>
        </div>
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onDeny} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground">Deny</button>
        <button
          type="button"
          onClick={() => onApprove(accountId)}
          autoFocus
          className="rounded-md bg-[oklch(0.40_0.10_160)] px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)]"
        >
          Approve →
        </button>
      </div>
    </div>
  )
}
