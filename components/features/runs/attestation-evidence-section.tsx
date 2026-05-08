import { Download } from 'lucide-react'
import type { Attestation } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CopyableHash } from '@/components/common/copyable-hash'
import { TrustIcon } from '@/components/common/trust-icon'
import { fmtDate } from '@/lib/format'

type Props = {
  attestation: Attestation
}

export function AttestationEvidenceSection({ attestation }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Attestation Evidence</CardTitle>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="size-3.5" />
            Verify locally
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 pt-4">
        {/* TEE measurement */}
        <EvidenceRow
          kind="tee"
          label="TEE measurement"
          hash={attestation.teeMeasurement}
        />

        {/* Code hash */}
        <EvidenceRow
          kind="signature"
          label="Code hash"
          hash={attestation.codeHash}
        />

        {/* Output signature */}
        <EvidenceRow
          kind="signature"
          label="Output signature"
          hash={attestation.outputSignature}
        />

        {/* On-chain anchor */}
        {attestation.anchorTxHash && (
          <div className="grid gap-1">
            <div className="flex items-center gap-2">
              <TrustIcon kind="anchor" className="text-muted-foreground" />
              <span className="font-tag text-xs text-foreground/60">On-chain anchor</span>
            </div>
            <CopyableHash value={attestation.anchorTxHash} short={false} className="text-xs" />
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {attestation.anchorChain && (
                <span>Chain: <span className="text-foreground">{attestation.anchorChain}</span></span>
              )}
              {attestation.anchorBlockNumber != null && (
                <span>Block: <span className="tabular-nums text-foreground">{attestation.anchorBlockNumber.toLocaleString()}</span></span>
              )}
              {attestation.anchoredAt && (
                <span>Anchored: <span className="text-foreground">{fmtDate(attestation.anchoredAt)}</span></span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

type EvidenceRowProps = {
  kind: 'tee' | 'anchor' | 'signature'
  label: string
  hash: string
}

function EvidenceRow({ kind, label, hash }: EvidenceRowProps) {
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-2">
        <TrustIcon kind={kind} className="text-muted-foreground" />
        <span className="font-tag text-xs text-foreground/60">{label}</span>
      </div>
      <CopyableHash value={hash} short={false} className="text-xs" />
    </div>
  )
}
