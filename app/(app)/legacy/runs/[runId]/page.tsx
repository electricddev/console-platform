import { requireUser } from '@/lib/auth/server'
import { getRun } from '@/lib/api/endpoints/runs'
import { ai } from '@/lib/api/endpoints/ai'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RunStatusIcon } from '@/components/features/runs/run-status-icon'
import { RunResultRenderer } from '@/components/features/runs/run-result-renderer'
import { AttestationEvidenceSection } from '@/components/features/runs/attestation-evidence-section'
import { ExecutionContextSection } from '@/components/features/runs/execution-context-section'
import { AiInterpretationSection } from '@/components/features/runs/ai-interpretation-section'

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>
}) {
  const { runId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const run = await getRun(ctx, runId)

  const runnerOrg = fixtures.orgs.find((o) => o.id === run.runnerOrgId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// run"
        title={
          <span className="inline-flex items-center gap-3">
            <RunStatusIcon status={run.status} className="size-5" />
            <span className="font-mono">{run.id}</span>
          </span>
        }
        actions={
          <Badge variant="outline" className="font-tag text-xs">
            {run.status}
          </Badge>
        }
      />

      <div className="mt-6 grid gap-4">
        {/* Result */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium">Result</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {run.result ? (
              <RunResultRenderer result={run.result} />
            ) : run.status === 'failed' ? (
              <p className="text-sm text-destructive">
                {run.error ?? 'Run failed without an error message.'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Result not yet available — run is{' '}
                <span className="font-medium text-foreground">{run.status}</span>.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Attestation evidence — only if attestation present */}
        {run.attestation && (
          <AttestationEvidenceSection attestation={run.attestation} />
        )}

        {/* Execution context */}
        <ExecutionContextSection run={run} runnerOrgName={runnerOrg?.name} />

        {/* AI interpretation */}
        <AiInterpretationSection
          runId={run.id}
          fetchSummary={async (id) => {
            'use server'
            return ai.summarizeRun(ctx, id)
          }}
        />

        {/* Downstream placeholder — Plan 06 fills this */}
        <Card className="border-dashed opacity-60">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Downstream consumers · Plan 06
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
