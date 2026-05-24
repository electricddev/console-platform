'use client'

import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
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
        <p className="text-[12.5px] text-muted-foreground">No trust copy available for this connector yet.</p>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="bg-v2-green text-white hover:bg-v2-green-hover" onClick={onContinue}>Continue →</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 px-1 pt-2">
      <div>
        <h2 className="font-serif text-[24px] font-normal leading-[1.15] tracking-[-0.005em] text-foreground mb-1">
          What Hyve will do with your {def?.name} data.
        </h2>
        <p className="text-[12.5px] text-muted-foreground mb-5">You&rsquo;re granting Hyve read access. Here&rsquo;s exactly what that means.</p>
      </div>

      <div>
        <Separator />
        <dl className="grid gap-0 divide-y divide-border">
          <Row k="Reads" v={trust.reads} />
          <Row k="Storage" v={trust.storage} />
          <Row k="Audit" v={trust.audit} />
          <Row k="Revoke" v={trust.revoke} />
        </dl>
        <Separator />
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <Button variant="link" size="sm" asChild>
          <a href="/legal/data-handling" target="_blank" rel="noopener noreferrer">Full data handling policy</a>
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" type="button" onClick={onCancel}>Cancel</Button>
          <Button size="sm" className="bg-v2-green text-white hover:bg-v2-green-hover" onClick={onContinue}>Continue →</Button>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="grid grid-cols-[96px_1fr] gap-4 py-4">
      <dt className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-muted-foreground">{k}</dt>
      <dd className="text-[13px] leading-relaxed text-foreground">{v}</dd>
    </div>
  )
}
