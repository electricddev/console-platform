import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Attestation, AttestationDiscipline } from '@/lib/api/schemas'

type Props = {
  fundName: string
  issuerName: string
  attestation: Attestation
  lastAttestedAt: string
  periodEnd: string
  discipline: AttestationDiscipline
}

export function BriefHeader({ fundName, issuerName, attestation, lastAttestedAt, periodEnd, discipline }: Props) {
  const periodLabel = new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  const onTimePct = Math.round((discipline.onTimeLast30d / discipline.expectedLast30d) * 100)
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-medium">{fundName}</h2>
        <AttestationBadge attestation={attestation} compact />
        <FreshnessIndicator timestamp={lastAttestedAt} />
      </div>
      <p className="text-sm text-muted-foreground">
        {issuerName} · Period end {periodLabel} · Last attest 30d on-time {onTimePct}% ({discipline.onTimeLast30d}/{discipline.expectedLast30d})
      </p>
    </header>
  )
}
