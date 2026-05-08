import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listTemplates } from '@/lib/api/endpoints/templates'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { ApprovalStatusCluster } from '@/components/features/templates/approval-status-cluster'
import { fmtRelativeTime, fmtDuration } from '@/lib/format'
import { Plus } from 'lucide-react'

export default async function TemplatesLibrary() {
  const session = await requireUser()
  const templates = await listTemplates({ user: session }, {})

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// library"
        title="Templates"
        description="Reusable methodology — write once, run against every dataset that approves the template."
        actions={
          <Button asChild>
            <Link href="/templates/new"><Plus className="size-3.5" /> Create template</Link>
          </Button>
        }
      />

      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th>Name</th>
              <th>Description</th>
              <th>Datasets</th>
              <th>Author</th>
              <th>Modified</th>
              <th className="text-right">Avg runtime</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => {
              const author = fixtures.users.find((u) => u.id === t.authorId)
              return (
                <tr key={t.id} className="border-t border-border/60 hover:bg-muted/40">
                  <td className="px-3 py-2">
                    <Link href={`/templates/${t.id}`} className="font-medium hover:underline">{t.name}</Link>
                    <span className="ml-2 font-tag text-[0.65rem] text-muted-foreground">v{t.versionNumber}</span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{t.description}</td>
                  <td className="px-3 py-2"><ApprovalStatusCluster approvals={t.approvals} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{author?.name ?? t.authorId}</td>
                  <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(t.lastModifiedAt)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.averageRuntimeMs ? fmtDuration(t.averageRuntimeMs) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
