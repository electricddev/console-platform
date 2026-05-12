import { BriefHeader } from './brief-header'
import { VitalSignsPanel } from './vital-signs-panel'
import { RedFlagScoreboard } from './red-flag-scoreboard'
import { AnomalyFeed } from './anomaly-feed'
import { PeerDispersionPanel } from './peer-dispersion-panel'
import { AttestationDisciplineTile } from './attestation-discipline-tile'
import { DrillOutActions } from './drill-out-actions'
import type { Dataset, RedFlag, AnomalyEvent, PeerDispersionRow, AttestationDiscipline } from '@/lib/api/schemas'
import { acredFacts } from '@/lib/data/acred/facts'
import { acredRedFlagRules } from '@/lib/data/acred/red-flags'

type Props = {
  dataset: Dataset
  issuerName: string
  redFlags: RedFlag[]
  anomalies: AnomalyEvent[]
  peerDispersion: PeerDispersionRow[]
  discipline: AttestationDiscipline
}

export function AcredBrief({ dataset, issuerName, redFlags, anomalies, peerDispersion, discipline }: Props) {
  const totalRules = acredRedFlagRules.length
  return (
    <div className="grid gap-8">
      <BriefHeader
        fundName={dataset.name}
        issuerName={issuerName}
        attestation={dataset.attestation}
        lastAttestedAt={dataset.lastAttestedAt}
        periodEnd={acredFacts.snapshot.periodEnd}
        discipline={discipline}
      />
      <VitalSignsPanel snapshot={acredFacts.snapshot} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <RedFlagScoreboard flags={redFlags} totalRules={totalRules} />
          <AnomalyFeed events={anomalies} />
        </div>
        <div className="grid gap-6">
          <PeerDispersionPanel rows={peerDispersion} />
          <AttestationDisciplineTile discipline={discipline} />
        </div>
      </div>
      <DrillOutActions
        exploreNonAccrualHref={`/datasets/${dataset.id}/explore?table=holdings&where=is_non_accrual%3Dtrue`}
        memoHref={`/notebooks/new?prefill=acred-brief-${acredFacts.snapshot.periodEnd.slice(0, 7)}`}
        filingsHref={`/datasets/${dataset.id}/runs`}
        nonAccrualCount={acredFacts.flaggedHoldings.nonAccrual}
      />
      <p className="text-xs text-muted-foreground">
        Peer dispersion and issuer attestation discipline are illustrative mocks until peer-fund integration and live SLA tracking ship.
      </p>
    </div>
  )
}
