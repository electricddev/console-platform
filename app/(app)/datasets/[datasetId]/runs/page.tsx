import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { getDatasetRuns } from '@/lib/api/endpoints/datasets'
import { fixtures } from '@/lib/api/fixtures'
import { Badge } from '@/components/ui/badge'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'
import { AttestationBadge } from '@/components/common/attestation-badge'

export default async function RunsTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const runs = await getDatasetRuns({ user: session }, datasetId)

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Run</th>
            <th>Template</th>
            <th>Runner</th>
            <th>Status</th>
            <th>When</th>
            <th className="text-right">Duration</th>
            <th>Attestation</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => {
            const runnerOrg = fixtures.orgs.find((o) => o.id === r.runnerOrgId)
            return (
              <tr key={r.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2"><Link href={`/runs/${r.id}`} className="font-mono text-xs hover:underline">{r.id}</Link></td>
                <td className="px-3 py-2"><Link href={`/templates/${r.templateId}`} className="hover:underline">{r.templateId}</Link></td>
                <td className="px-3 py-2 text-muted-foreground">{runnerOrg?.name ?? r.runnerOrgId}</td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{r.status}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.durationMs ? fmtDuration(r.durationMs) : '—'}</td>
                <td className="px-3 py-2">
                  {r.attestation ? <CopyableHash value={r.attestation.outputSignature} /> : <AttestationBadge attestation={null} compact />}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {runs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No runs yet.</p>}
    </div>
  )
}
