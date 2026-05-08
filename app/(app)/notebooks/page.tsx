import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listNotebooks } from '@/lib/api/endpoints/notebooks'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime } from '@/lib/format'
import { Plus } from 'lucide-react'

export default async function NotebooksPage() {
  const session = await requireUser()
  const notebooks = await listNotebooks({ user: session })
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// notebooks" title="Notebooks" description="Reproducible IC-ready memos with attested data, charts, and signed appendix." actions={<Button asChild><Link href="/notebooks/new"><Plus className="size-3.5" /> New notebook</Link></Button>} />
      <div className="mt-6 grid gap-3">
        {notebooks.map((n) => {
          const author = fixtures.users.find((u) => u.id === n.authorId)
          return (
            <Link key={n.id} href={`/notebooks/${n.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3 hover:bg-surface">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.cells.length} cells · {n.description}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{author?.name}</p>
                <p>{fmtRelativeTime(n.updatedAt)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
