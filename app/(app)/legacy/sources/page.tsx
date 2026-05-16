import Link from 'next/link'
import { requireRole } from '@/lib/auth/server'
import { listSources } from '@/lib/api/endpoints/sources'
import { PageHeader } from '@/components/common/page-header'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import { IngestionSparkline } from '@/components/features/sources/ingestion-sparkline'
import { AddDataSourceDialog } from '@/components/features/sources/add-data-source-dialog'
import { Badge } from '@/components/ui/badge'
import { fmtNumber, fmtPct, fmtDuration } from '@/lib/format'

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  healthy: 'default',
  lagging: 'outline',
  paused: 'secondary',
  down: 'destructive',
}

/** Deterministic fake 7-day volume values seeded from source id. */
function fakeSparkline(sourceId: string): number[] {
  const seed = sourceId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return Array.from({ length: 7 }, (_, i) => 400 + ((seed * (i + 1) * 31) % 400))
}

export default async function SourcesPage() {
  const session = await requireRole('originator')
  const sources = await listSources({ user: session })

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// sources"
        title="Data Sources"
        description="All connected data sources for your organisation. Click any row to inspect ingestion history."
        actions={<AddDataSourceDialog />}
      />

      <div className="mt-6 rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 text-left font-tag text-foreground/60">Name</th>
              <th className="px-4 py-2.5 text-left font-tag text-foreground/60">Type</th>
              <th className="px-4 py-2.5 text-right font-tag text-foreground/60">Records</th>
              <th className="px-4 py-2.5 text-right font-tag text-foreground/60">Completeness</th>
              <th className="px-4 py-2.5 text-right font-tag text-foreground/60">Lag</th>
              <th className="px-4 py-2.5 text-center font-tag text-foreground/60">7-day volume</th>
              <th className="px-4 py-2.5 text-left font-tag text-foreground/60">Last commit</th>
              <th className="px-4 py-2.5 text-left font-tag text-foreground/60">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {sources.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/legacy/sources/${s.id}`}
                    className="font-medium hover:underline underline-offset-2"
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant="outline">{s.type}</Badge>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {fmtNumber(s.recordsProcessed)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {fmtPct(s.completenessPct)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                  {fmtDuration(s.lagSeconds * 1000)}
                </td>
                <td className="px-4 py-2.5 flex justify-center text-muted-foreground">
                  <IngestionSparkline values={fakeSparkline(s.id)} />
                </td>
                <td className="px-4 py-2.5">
                  <FreshnessIndicator timestamp={s.lastCommitAt} />
                </td>
                <td className="px-4 py-2.5">
                  <Badge variant={statusVariant[s.status] ?? 'outline'}>{s.status}</Badge>
                </td>
              </tr>
            ))}
            {sources.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No sources connected yet.{' '}
                  <Link href="/legacy/sources/new" className="underline underline-offset-2">
                    Connect your first source.
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
