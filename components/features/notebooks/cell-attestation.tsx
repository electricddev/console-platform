import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fixtures } from '@/lib/api/fixtures'

export function CellAttestation({ runIds }: { runIds: string[] }) {
  const runs = runIds.map((id) => fixtures.runs.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r)
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Cryptographic appendix</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        {runs.map((r) => (
          <div key={r.id} className="grid gap-1 rounded-md border border-border/60 bg-surface/30 p-3 text-xs">
            <p className="font-tag text-foreground/55">{`// ${r.id}`}</p>
            {r.attestation && <CopyableHash value={r.attestation.outputSignature} short={false} />}
            {r.attestation?.anchorTxHash && <CopyableHash value={r.attestation.anchorTxHash} short={false} />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
