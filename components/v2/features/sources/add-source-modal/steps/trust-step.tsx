'use client'

import { connectorById } from '../../catalog-data'

type Props = {
  connectorId: string
  onContinue: () => void
  onCancel: () => void
}

export function TrustStep({ connectorId, onContinue, onCancel }: Props) {
  const def = connectorById(connectorId)
  const trust = def?.trust

  if (!trust) {
    return (
      <div className="flex flex-col gap-3 px-1 pt-2">
        <p className="text-[12.5px] text-v2-muted">No trust copy available for this connector yet.</p>
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground">Cancel</button>
          <button type="button" onClick={onContinue} className="rounded-md bg-[oklch(0.40_0.10_160)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)] hover:shadow-[0_4px_18px_-8px_oklch(0.40_0.10_160_/_0.5)] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground">Continue →</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-1 pt-2">
      <div>
        <h2 className="font-serif text-[24px] font-normal leading-[1.15] tracking-[-0.005em] text-v2-foreground mb-1">
          What Hyve will do with your {def?.name} data.
        </h2>
        <p className="text-[12.5px] text-v2-muted mb-5">You&rsquo;re granting Hyve read access. Here&rsquo;s exactly what that means.</p>
      </div>

      <dl className="grid gap-0 divide-y divide-v2-border/60 border-t border-b border-v2-border/60">
        <Row k="Reads" v={trust.reads} />
        <Row k="Storage" v={trust.storage} />
        <Row k="Audit" v={trust.audit} />
        <Row k="Revoke" v={trust.revoke} />
      </dl>

      <div className="flex items-center justify-between gap-3 pt-1">
        <a
          href="/legal/data-handling"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11.5px] text-v2-muted underline underline-offset-2 hover:text-v2-foreground transition-colors duration-150"
        >
          Full data handling policy
        </a>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-v2-border px-3 py-1.5 text-[12px] text-v2-muted hover:text-v2-foreground transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground">Cancel</button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-md bg-[oklch(0.40_0.10_160)] px-5 py-2 text-[12.5px] font-medium text-white hover:bg-[oklch(0.36_0.10_160)] hover:shadow-[0_4px_18px_-8px_oklch(0.40_0.10_160_/_0.5)] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-v2-foreground"
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-4 py-4">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-v2-muted">{k}</dt>
      <dd className="text-[12.5px] leading-relaxed text-v2-foreground">{v}</dd>
    </div>
  )
}
