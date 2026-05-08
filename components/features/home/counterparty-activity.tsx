import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fmtRelativeTime } from '@/lib/format'
import { fixtures } from '@/lib/api/fixtures'
import type { Run } from '@/lib/api/types'

export function CounterpartyActivity({ runs }: { runs: Run[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Counterparty activity (last 7 days)</CardTitle>
      </CardHeader>
      <CardContent className="grid divide-y divide-border/60 px-0">
        {runs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No activity in the past week.
          </p>
        ) : (
          runs.map((r) => {
            const org = fixtures.orgs.find((o) => o.id === r.runnerOrgId)
            return (
              <Link
                key={r.id}
                href={`/runs/${r.id}`}
                className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{org?.name ?? r.runnerOrgId}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    ran {r.templateId} on {r.datasetId}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{fmtRelativeTime(r.queuedAt)}</span>
              </Link>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
