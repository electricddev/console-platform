'use client'

import { ShieldCheck, ShieldAlert } from 'lucide-react'
import type { Attestation } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CopyableHash } from './copyable-hash'
import { TrustIcon } from './trust-icon'
import { fmtDate } from '@/lib/format'
import { cn } from '@/lib/utils'

type Props = {
  attestation?: Attestation | null
  className?: string
  /** When true, shows a compact icon-only chip; popover still works. */
  compact?: boolean
}

export function AttestationBadge({ attestation, className, compact }: Props) {
  if (!attestation) {
    return (
      <Badge variant="outline" className={cn('gap-1 text-warning border-warning/40', className)}>
        <ShieldAlert className="size-3" />
        {compact ? null : 'Unattested'}
      </Badge>
    )
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[0.7rem] font-medium text-success transition-colors hover:bg-success/15',
            className
          )}
        >
          <ShieldCheck className="size-3" />
          {compact ? null : <span>Verified</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96">
        <div className="grid gap-3 text-sm">
          <div className="flex items-center gap-2">
            <TrustIcon kind="tee" />
            <span className="font-medium">TEE measurement</span>
          </div>
          <CopyableHash value={attestation.teeMeasurement} short={false} className="text-xs" />

          <div className="flex items-center gap-2 pt-2">
            <TrustIcon kind="signature" />
            <span className="font-medium">Code hash</span>
          </div>
          <CopyableHash value={attestation.codeHash} short={false} className="text-xs" />

          <div className="flex items-center gap-2 pt-2">
            <TrustIcon kind="signature" />
            <span className="font-medium">Output signature</span>
          </div>
          <CopyableHash value={attestation.outputSignature} short={false} className="text-xs" />

          {attestation.anchorTxHash && (
            <>
              <div className="flex items-center gap-2 pt-2">
                <TrustIcon kind="anchor" />
                <span className="font-medium">On-chain anchor</span>
              </div>
              <div className="flex flex-col gap-1">
                <CopyableHash value={attestation.anchorTxHash} short={false} className="text-xs" />
                <span className="text-xs text-muted-foreground">
                  {attestation.anchorChain ?? 'unknown'} · block {attestation.anchorBlockNumber ?? '—'}
                  {attestation.anchoredAt ? ` · ${fmtDate(attestation.anchoredAt)}` : ''}
                </span>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
