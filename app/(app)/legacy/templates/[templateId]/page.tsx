import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getTemplate } from '@/lib/api/endpoints/templates'
import { listRuns, executeTemplate } from '@/lib/api/endpoints/runs'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ApprovalStatusCluster } from '@/components/features/templates/approval-status-cluster'
import { RunTemplateDialog } from '@/components/features/templates/run-template-dialog'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'

export default async function TemplateDetail({
  params,
}: {
  params: Promise<{ templateId: string }>
}) {
  const { templateId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const [tpl, runs] = await Promise.all([
    getTemplate(ctx, templateId),
    listRuns(ctx, { templateId }),
  ])
  const author = fixtures.users.find((u) => u.id === tpl.authorId)
  const approvedDatasetIds = tpl.approvals
    .filter((a) => a.state === 'approved')
    .map((a) => a.datasetId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// template · v${tpl.versionNumber}`}
        title={tpl.name}
        description={tpl.description}
        actions={
          <div className="flex gap-2">
            <Link
              href={`/templates/${tpl.id}/edit`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
            >
              Edit
            </Link>
            <RunTemplateDialog
              template={tpl}
              approvedDatasetIds={approvedDatasetIds}
              onRun={async (input) => {
                'use server'
                const r = await executeTemplate({ user: session }, input)
                return { id: r.id }
              }}
            />
          </div>
        }
      />

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovalStatusCluster approvals={tpl.approvals} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Author</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {author?.name ?? tpl.authorId} · {fmtRelativeTime(tpl.lastModifiedAt)}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">DSL</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs">
              {tpl.dsl}
            </pre>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Parameters</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {tpl.parameters.length === 0 ? (
              <p className="text-xs text-muted-foreground">No parameters.</p>
            ) : (
              tpl.parameters.map((p) => (
                <div key={p.name} className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs">{p.name}</span>
                  <Badge variant="outline" className="font-tag text-[0.65rem]">
                    {p.type}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="mt-6 grid gap-3">
        <h2 className="font-tag text-foreground/60">{'// recent runs'}</h2>
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left font-tag text-foreground/55">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Run</th>
                <th>Dataset</th>
                <th>Status</th>
                <th>When</th>
                <th className="text-right">Duration</th>
                <th>Attestation</th>
              </tr>
            </thead>
            <tbody>
              {runs.slice(0, 50).map((r) => (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/runs/${r.id}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {r.id}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/datasets/${r.datasetId}`} className="hover:underline">
                      {r.datasetId}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="outline" className="font-tag text-[0.65rem]">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtRelativeTime(r.queuedAt)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {r.durationMs ? fmtDuration(r.durationMs) : '—'}
                  </td>
                  <td className="px-3 py-2">
                    {r.attestation ? (
                      <CopyableHash value={r.attestation.outputSignature} />
                    ) : (
                      <AttestationBadge attestation={null} compact />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
