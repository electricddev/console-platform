import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listApprovals } from '@/lib/api/endpoints/approvals'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { fmtRelativeTime } from '@/lib/format'

const STATES = ['pending', 'approved', 'denied', 'changes-requested'] as const

export default async function ApprovalsInbox() {
  const session = await requireUser()
  const all = await listApprovals({ user: session })

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// inbox"
        title="Template approvals"
        description="Counterparties propose templates against your data. Review the DSL, simulate privately, then sign or deny."
      />
      <div className="mt-6 grid gap-6">
        {STATES.map((state) => {
          const items = all.filter((a) => a.state === state)
          if (items.length === 0) return null
          return (
            <section key={state} className="grid gap-2">
              <h2 className="font-tag text-foreground/60">{'// ' + state}</h2>
              <div className="overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-surface/60 text-left font-tag text-foreground/55">
                    <tr className="[&>th]:px-3 [&>th]:py-2">
                      <th>Template</th>
                      <th>Dataset</th>
                      <th>From</th>
                      <th>Requested</th>
                      <th>Urgency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((a) => {
                      const org = fixtures.orgs.find((o) => o.id === a.requesterOrgId)
                      return (
                        <tr key={a.id} className="border-t border-border/60 hover:bg-muted/40">
                          <td className="px-3 py-2">
                            <Link href={`/approvals/${a.id}`} className="font-medium hover:underline underline-offset-2">
                              {a.templateId}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                            {a.datasetId}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {org?.name ?? a.requesterOrgId}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {fmtRelativeTime(a.requestedAt)}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant="outline"
                              className={
                                a.urgency === 'high'
                                  ? 'bg-warning/15 text-warning border-warning/30'
                                  : 'font-tag text-[0.65rem]'
                              }
                            >
                              {a.urgency}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
