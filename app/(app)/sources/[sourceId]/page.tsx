import { requireRole } from '@/lib/auth/server'
import { getSource, getSourceEvents, pauseSource, resumeSource } from '@/lib/api/endpoints/sources'
import { PageHeader } from '@/components/common/page-header'
import { KeyValue } from '@/components/common/key-value'
import { CopyableHash } from '@/components/common/copyable-hash'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtNumber, fmtPct, fmtDuration, fmtDate, fmtRelativeTime } from '@/lib/format'

const outcomeVariant = {
  committed: 'default',
  partial: 'outline',
  failed: 'destructive',
} as const

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  healthy: 'default',
  lagging: 'outline',
  paused: 'secondary',
  down: 'destructive',
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ sourceId: string }>
}) {
  const { sourceId } = await params
  const session = await requireRole('originator')
  const ctx = { user: session }

  const [source, events] = await Promise.all([
    getSource(ctx, sourceId),
    getSourceEvents(ctx, sourceId),
  ])

  const installAge = fmtRelativeTime(source.agentInstalledAt)

  async function togglePause() {
    'use server'
    const s = await requireRole('originator')
    const ctx2 = { user: s }
    const current = await getSource(ctx2, sourceId)
    if (current.status === 'paused') {
      await resumeSource(ctx2, sourceId)
    } else {
      await pauseSource(ctx2, sourceId)
    }
  }

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// source · ${source.type}`}
        title={source.name}
        description={`Agent v${source.agentVersion} · installed ${installAge}`}
        actions={
          <form action={togglePause}>
            <Button type="submit" variant="outline" size="sm">
              {source.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
          </form>
        }
      />

      <div className="mt-6 grid gap-6">
        {/* Metric grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KeyValue label="Records processed" value={fmtNumber(source.recordsProcessed)} />
          <KeyValue label="Completeness" value={fmtPct(source.completenessPct)} />
          <KeyValue label="Lag" value={fmtDuration(source.lagSeconds * 1000)} />
          <KeyValue
            label="Status"
            value={
              <Badge variant={statusVariant[source.status] ?? 'outline'}>{source.status}</Badge>
            }
          />
        </div>

        {/* Ingestion events */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-sm font-medium">Recent ingestion events</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {events.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No ingestion events recorded yet.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-2 text-left font-tag text-foreground/60">Timestamp</th>
                    <th className="px-4 py-2 text-right font-tag text-foreground/60">Records</th>
                    <th className="px-4 py-2 text-left font-tag text-foreground/60">Commit</th>
                    <th className="px-4 py-2 text-left font-tag text-foreground/60">Outcome</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/20">
                      <td className="px-4 py-2 tabular-nums text-muted-foreground">
                        {fmtDate(e.timestamp)}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {fmtNumber(e.recordCount)}
                      </td>
                      <td className="px-4 py-2">
                        <CopyableHash value={e.commitHash} />
                      </td>
                      <td className="px-4 py-2">
                        <Badge
                          variant={outcomeVariant[e.outcome] ?? 'outline'}
                          className={
                            e.outcome === 'partial'
                              ? 'border-warning/40 bg-warning/10 text-warning'
                              : undefined
                          }
                        >
                          {e.outcome}
                        </Badge>
                        {e.error && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{e.error}</p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
