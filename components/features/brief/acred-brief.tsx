'use client'
import { useTransition } from 'react'
import { BriefHeader } from './brief-header'
import { VitalSignsPanel } from './vital-signs-panel'
import { RedFlagScoreboard } from './red-flag-scoreboard'
import { AnomalyFeed } from './anomaly-feed'
import { PeerDispersionPanel } from './peer-dispersion-panel'
import { AttestationDisciplineTile } from './attestation-discipline-tile'
import { DrillOutActions } from './drill-out-actions'
import { RedFlagActionBar } from './red-flag-action-bar'
import { AnomalyActionBar } from './anomaly-action-bar'
import { WatchToggle } from './watch-toggle'
import { acredFacts } from '@/lib/data/acred/facts'
import { acredRedFlagRules } from '@/lib/data/acred/red-flags'
import {
  actionAcknowledgeFlag, actionSnoozeFlag, actionSetThreshold,
  actionDismissAnomaly, actionSetWatch, actionClearWatch,
} from '@/app/(app)/datasets/[datasetId]/decisions-actions'
import type {
  Dataset, RedFlag, AnomalyEvent, PeerDispersionRow,
  AttestationDiscipline, NotificationChannelKind,
} from '@/lib/api/schemas'

type Props = {
  dataset: Dataset
  issuerName: string
  redFlags: RedFlag[]
  anomalies: AnomalyEvent[]
  peerDispersion: PeerDispersionRow[]
  discipline: AttestationDiscipline
  initialWatching: boolean
  initialWatchChannels: NotificationChannelKind[]
}

export function AcredBrief({
  dataset, issuerName, redFlags, anomalies, peerDispersion, discipline,
  initialWatching, initialWatchChannels,
}: Props) {
  const [, startTransition] = useTransition()
  const totalRules = acredRedFlagRules.length

  return (
    <div className="grid gap-8">
      <div className="flex items-center justify-between">
        <BriefHeader issuerName={issuerName} periodEnd={acredFacts.snapshot.periodEnd} discipline={discipline} />
        <WatchToggle
          datasetId={dataset.id}
          initialWatching={initialWatching}
          initialChannels={initialWatchChannels}
          onWatch={(channels) => startTransition(() => { actionSetWatch({ datasetId: dataset.id, channels }) })}
          onUnwatch={() => startTransition(() => { actionClearWatch(dataset.id) })}
        />
      </div>
      <VitalSignsPanel snapshot={acredFacts.snapshot} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="grid gap-6">
          <RedFlagScoreboard
            flags={redFlags}
            totalRules={totalRules}
            renderActions={(f) => (
              <RedFlagActionBar
                flagId={f.id} datasetId={dataset.id}
                sliderEligible={Boolean(acredRedFlagRules.find((r) => r.id === f.id)?.thresholdMetric)}
                onAcknowledge={(note) => startTransition(() => { actionAcknowledgeFlag({ flagId: f.id, datasetId: dataset.id, note }) })}
                onSnooze={() => startTransition(() => { actionSnoozeFlag({ flagId: f.id, datasetId: dataset.id }) })}
                onSetThreshold={(metric, value) => startTransition(() => { actionSetThreshold({ ruleId: f.id, datasetId: dataset.id, metric, value, direction: 'above' }) })}
              />
            )}
          />
          <AnomalyFeed
            events={anomalies}
            renderActions={(e) => (
              <AnomalyActionBar
                anomalyId={e.id}
                onDismiss={(reason) => startTransition(() => { actionDismissAnomaly({ anomalyId: e.id, reason, datasetId: dataset.id }) })}
                onPinToMemo={() => { window.location.href = `/datasets/${dataset.id}/memo` }}
                onConvertToRule={() => { window.location.href = `/alerts/rules/new?metric=${encodeURIComponent(e.kind)}` }}
              />
            )}
          />
        </div>
        <div className="grid gap-6">
          <PeerDispersionPanel rows={peerDispersion} />
          <AttestationDisciplineTile discipline={discipline} />
        </div>
      </div>
      <DrillOutActions
        exploreNonAccrualHref={`/datasets/${dataset.id}/explore?table=holdings&where=is_non_accrual%3Dtrue`}
        memoHref={`/datasets/${dataset.id}/memo`}
        filingsHref={`/datasets/${dataset.id}/runs`}
        nonAccrualCount={acredFacts.flaggedHoldings.nonAccrual}
      />
      <p className="text-xs text-muted-foreground">
        Peer dispersion and issuer attestation discipline are illustrative mocks until peer-fund integration and live SLA tracking ship.
      </p>
    </div>
  )
}
