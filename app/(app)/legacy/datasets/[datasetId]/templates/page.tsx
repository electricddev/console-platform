import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listTemplates } from '@/lib/api/endpoints/templates'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { EmptyState } from '@/components/common/empty-state'

export default async function TemplatesTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const templates = await listTemplates({ user: session }, { datasetId })

  if (templates.length === 0) {
    return (
      <EmptyState
        title="No approved templates against this dataset yet"
        description="Propose a new template to start running queries here."
        action={<Button asChild><Link href={`/templates/new?dataset=${datasetId}`}>Propose template</Link></Button>}
      />
    )
  }

  return (
    <div className="overflow-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-surface/60 text-left font-tag text-foreground/55">
          <tr className="[&>th]:px-3 [&>th]:py-2">
            <th>Name</th>
            <th>Status</th>
            <th>Description</th>
            <th>Last modified</th>
            <th className="text-right">Avg runtime</th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => {
            const approval = t.approvals.find((a) => a.datasetId === datasetId)
            return (
              <tr key={t.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2"><Link href={`/templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link></td>
                <td className="px-3 py-2"><Badge variant="outline" className="font-tag text-[0.65rem]">{approval?.state ?? 'unsubmitted'}</Badge></td>
                <td className="px-3 py-2 text-muted-foreground">{t.description}</td>
                <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(t.lastModifiedAt)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{t.averageRuntimeMs ? fmtDuration(t.averageRuntimeMs) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
