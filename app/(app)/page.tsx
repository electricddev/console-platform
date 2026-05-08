import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { listRuns } from '@/lib/api/endpoints/runs'
import { listSources } from '@/lib/api/endpoints/sources'
import { listApprovals } from '@/lib/api/endpoints/approvals'
import { getCounterpartyInsights } from '@/lib/api/endpoints/insights'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { CounterpartyHome } from '@/components/features/home/counterparty-home'
import { OriginatorHome } from '@/components/features/home/originator-home'

export default async function HomePage() {
  const session = await requireUser()
  const ctx = { user: session }
  const me = await getCurrentUser(ctx)
  const org = fixtures.orgs.find((o) => o.id === me.orgId)!

  if (me.role === 'originator') {
    const [sources, pendingApprovals, recentRuns] = await Promise.all([
      listSources(ctx),
      listApprovals(ctx, { state: 'pending' }),
      listRuns(ctx, {}),
    ])
    return (
      <div className="px-6 py-6 max-w-7xl mx-auto">
        <PageHeader eyebrow={`// home · originator`} title={`Welcome, ${me.name.split(' ')[0]}`} description={`${org.name} — control plane for your data`} />
        <div className="mt-6">
          <OriginatorHome sources={sources} pendingApprovals={pendingApprovals} recentRuns={recentRuns} />
        </div>
      </div>
    )
  }

  // Counterparty / admin path
  const [allDatasets, recentRuns, insights] = await Promise.all([
    listDatasets(ctx, {}),
    listRuns(ctx, {}),
    getCounterpartyInsights(ctx),
  ])
  const watched = allDatasets.filter((d) => d.watching)
  const pending = [
    { id: 't1', title: 'Run #4823 awaiting your review', href: '/runs/run_4823', kind: 'run' },
    { id: 't2', title: 'Template "Default rate by vintage" needs changes', href: '/templates/tpl_default_rate_by_vintage', kind: 'template' },
  ]

  return (
    <div className="mx-auto max-w-[1400px]">
      <CounterpartyHome
        userName={me.name}
        orgName={org.name}
        watched={watched}
        recentRuns={recentRuns}
        insights={insights}
        pending={pending}
      />
    </div>
  )
}
