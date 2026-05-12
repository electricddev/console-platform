import { requireUser } from '@/lib/auth/server'
import {
  getDataset, getAcredBriefRedFlags, getAcredAnomalyFeed,
  getAcredPeerDispersion, getAcredAttestationDiscipline,
} from '@/lib/api/endpoints/datasets'
import { ai } from '@/lib/api/endpoints/ai'
import { fixtures } from '@/lib/api/fixtures'
import { Card, CardContent } from '@/components/ui/card'
import { fmtNumber, fmtPct } from '@/lib/format'
import { MetricCard } from '@/components/features/home/metric-card'
import { AskAnythingInput } from '@/components/features/datasets/ask-anything-input'
import { InsightCard } from '@/components/features/home/insight-card'
import { AcredBrief } from '@/components/features/brief/acred-brief'

export default async function DatasetOverview({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const ctx = { user: session }

  if (datasetId === 'ds_acred') {
    const [ds, redFlags, anomalies, peerDispersion, discipline] = await Promise.all([
      getDataset(ctx, datasetId),
      getAcredBriefRedFlags(ctx),
      getAcredAnomalyFeed(ctx),
      getAcredPeerDispersion(ctx),
      getAcredAttestationDiscipline(ctx),
    ])
    const org = fixtures.orgs.find((o) => o.id === ds.originatorOrgId)
    return (
      <AcredBrief
        dataset={ds}
        issuerName={org?.name ?? ds.originatorOrgId}
        redFlags={redFlags}
        anomalies={anomalies}
        peerDispersion={peerDispersion}
        discipline={discipline}
      />
    )
  }

  // Legacy overview for non-ACRED datasets — unchanged.
  const [ds, suggestions, anomalies] = await Promise.all([
    getDataset(ctx, datasetId),
    ai.suggestQueries(ctx, datasetId),
    ai.detectAnomalies(ctx, datasetId),
  ])

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard label="Records under management" value={fmtNumber(ds.recordCount)} attestation={ds.attestation} freshAt={ds.lastAttestedAt} />
        <MetricCard label="Completeness" value={fmtPct(ds.completenessPct)} attestation={ds.attestation} />
        <MetricCard label="Schema version" value={`v${ds.schemaVersion}`} />
        <MetricCard label="Active templates" value={fmtNumber(ds.templateCount)} />
        <MetricCard label="Lifetime runs" value={fmtNumber(ds.lifetimeRunCount)} />
        <MetricCard label="Status" value={ds.status} />
      </section>
      {ds.alerts.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-tag text-foreground/60">{'// active alerts'}</h2>
          {ds.alerts.map((a) => (
            <Card key={a.id} className="border-l-2 border-warning/60 bg-warning/5">
              <CardContent className="py-3">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.body}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      )}
      <section className="grid gap-3">
        <h2 className="font-tag text-foreground/60">{'// ask the dataset'}</h2>
        <AskAnythingInput
          datasetId={datasetId}
          suggestions={suggestions}
          onAsk={async (q) => {
            'use server'
            return { href: `/templates/new?dataset=${datasetId}&prompt=${encodeURIComponent(q)}` }
          }}
        />
      </section>
      <section className="grid gap-3">
        <h2 className="font-tag text-foreground/60">{'// anomalies'}</h2>
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">No anomalies detected.</p>
        ) : (
          anomalies.map((i) => <InsightCard key={i.id} insight={i} />)
        )}
      </section>
      {ds.description && (
        <section className="grid gap-2">
          <h2 className="font-tag text-foreground/60">{'// description'}</h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">{ds.description}</p>
        </section>
      )}
    </div>
  )
}
