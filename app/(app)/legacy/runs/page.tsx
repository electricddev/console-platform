import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listRuns } from '@/lib/api/endpoints/runs'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { RunStatusIcon } from '@/components/features/runs/run-status-icon'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'

export default async function RunsHistoryPage() {
  const session = await requireUser()
  const runs = await listRuns({ user: session }, {})

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// history"
        title="Runs"
        description="All query executions across datasets and templates — each anchored and attested."
      />

      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th className="w-6" />
              <th>Run</th>
              <th>Template</th>
              <th>Dataset</th>
              <th>Runner</th>
              <th>When</th>
              <th className="text-right">Duration</th>
              <th>Attestation</th>
              <th>Anchor</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => {
              const runnerOrg = fixtures.orgs.find((o) => o.id === r.runnerOrgId)
              return (
                <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                  {/* Status icon */}
                  <td className="px-3 py-2">
                    <RunStatusIcon status={r.status} />
                  </td>

                  {/* Run id */}
                  <td className="px-3 py-2">
                    <Link
                      href={`/runs/${r.id}`}
                      className="font-mono text-xs hover:underline"
                    >
                      {r.id}
                    </Link>
                  </td>

                  {/* Template */}
                  <td className="px-3 py-2">
                    <Link
                      href={`/templates/${r.templateId}`}
                      className="hover:underline text-muted-foreground"
                    >
                      {r.templateId}
                    </Link>
                  </td>

                  {/* Dataset */}
                  <td className="px-3 py-2">
                    <Link
                      href={`/datasets/${r.datasetId}`}
                      className="hover:underline text-muted-foreground"
                    >
                      {r.datasetId}
                    </Link>
                  </td>

                  {/* Runner org */}
                  <td className="px-3 py-2 text-muted-foreground">
                    {runnerOrg?.name ?? r.runnerOrgId}
                  </td>

                  {/* When */}
                  <td className="px-3 py-2 text-muted-foreground">
                    {fmtRelativeTime(r.queuedAt)}
                  </td>

                  {/* Duration */}
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {r.durationMs != null ? fmtDuration(r.durationMs) : '—'}
                  </td>

                  {/* Attestation */}
                  <td className="px-3 py-2">
                    {r.attestation ? (
                      <CopyableHash value={r.attestation.outputSignature} />
                    ) : (
                      <AttestationBadge attestation={null} compact />
                    )}
                  </td>

                  {/* Anchor */}
                  <td className="px-3 py-2">
                    {r.attestation?.anchorTxHash ? (
                      <CopyableHash value={r.attestation.anchorTxHash} />
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {runs.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">No runs yet.</p>
        )}
      </div>
    </div>
  )
}
