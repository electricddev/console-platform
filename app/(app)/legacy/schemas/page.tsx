import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listSchemas } from '@/lib/api/endpoints/schemas-endpoint'
import { PageHeader } from '@/components/common/page-header'
import { fmtRelativeTime } from '@/lib/format'

export default async function SchemasPage() {
  const session = await requireUser()
  const schemas = await listSchemas({ user: session })

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// schemas"
        title="Queryable schemas"
        description="Define which fields counterparties can query and how. Versioned and signed."
      />
      <div className="mt-6 overflow-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface/60 text-left font-tag text-foreground/55">
            <tr className="[&>th]:px-3 [&>th]:py-2">
              <th>Schema</th>
              <th>Dataset</th>
              <th>Version</th>
              <th className="text-right">Fields</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {schemas.map((s) => (
              <tr key={s.id} className="border-t border-border/60 hover:bg-muted/40">
                <td className="px-3 py-2">
                  <Link href={`/schemas/${s.id}`} className="font-medium hover:underline underline-offset-2">
                    {s.id}
                  </Link>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{s.datasetId}</td>
                <td className="px-3 py-2 tabular-nums">v{s.version}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.fields.length}</td>
                <td className="px-3 py-2 text-muted-foreground">{fmtRelativeTime(s.publishedAt)}</td>
              </tr>
            ))}
            {schemas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No schemas defined yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
