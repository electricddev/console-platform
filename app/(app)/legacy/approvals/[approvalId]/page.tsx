import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getApproval, simulatePrivate, approveRequest, denyRequest, requestChanges } from '@/lib/api/endpoints/approvals'
import { getTemplate } from '@/lib/api/endpoints/templates'
import { ai } from '@/lib/api/endpoints/ai'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyValue } from '@/components/common/key-value'
import { fmtDate } from '@/lib/format'
import { LeakageRiskMeter } from '@/components/features/approvals/leakage-risk-meter'
import { PrivateSimulationPanel } from '@/components/features/approvals/private-simulation-panel'
import { ApprovalDecisionBar } from '@/components/features/approvals/approval-decision-bar'

export default async function ApprovalDetail({
  params,
}: {
  params: Promise<{ approvalId: string }>
}) {
  const { approvalId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const a = await getApproval(ctx, approvalId)
  const tpl = await getTemplate(ctx, a.templateId)
  const privacy = await ai.privacyAnalysis(ctx, { dsl: tpl.dsl, schemaId: 'sch_mfone_v3' })
  const requesterOrg = fixtures.orgs.find((o) => o.id === a.requesterOrgId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// approval · ${a.state}`}
        title={tpl.name}
        description={
          <>
            Requested by <strong>{requesterOrg?.name ?? a.requesterOrgId}</strong> on{' '}
            <Link href={`/datasets/${a.datasetId}`} className="hover:underline underline-offset-2">
              {a.datasetId}
            </Link>
          </>
        }
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">DSL</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md border border-border/60 bg-background p-3 font-mono text-xs">
              {tpl.dsl}
            </pre>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Privacy analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <LeakageRiskMeter score={privacy.riskScore} />
              <ul className="grid gap-1.5">
                {privacy.findings.map((f, i) => (
                  <li key={i} className="rounded-md border border-border/60 bg-surface/30 p-2">
                    <p className="font-medium">{f.message}</p>
                    {f.remediation && (
                      <p className="text-xs text-muted-foreground">→ {f.remediation}</p>
                    )}
                  </li>
                ))}
                {privacy.findings.length === 0 && (
                  <p className="text-xs text-muted-foreground">No leakage paths detected.</p>
                )}
              </ul>
            </CardContent>
          </Card>
          <PrivateSimulationPanel
            approvalId={a.id}
            fetchSim={async (id) => {
              'use server'
              return simulatePrivate({ user: session }, { approvalId: id })
            }}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3 rounded-lg border border-border bg-surface/40 p-4">
        <KeyValue label="Requested" value={fmtDate(a.requestedAt)} />
        <KeyValue label="Urgency" value={a.urgency} />
        <KeyValue label="State" value={a.state} />
      </section>

      {a.state === 'pending' && (
        <div className="mt-6">
          <ApprovalDecisionBar
            approvalId={a.id}
            onApprove={async (id) => {
              'use server'
              await approveRequest({ user: session }, { approvalId: id })
            }}
            onDeny={async (id, rationale) => {
              'use server'
              await denyRequest({ user: session }, { approvalId: id, rationale })
            }}
            onRequestChanges={async (id, rationale) => {
              'use server'
              await requestChanges({ user: session }, { approvalId: id, rationale })
            }}
          />
        </div>
      )}
    </div>
  )
}
