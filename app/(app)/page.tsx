import { requireUser } from '@/lib/auth/server'
import { getCurrentUser } from '@/lib/api/endpoints/me'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { listRuns } from '@/lib/api/endpoints/runs'
import { getCounterpartyInsights } from '@/lib/api/endpoints/insights'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { CounterpartyHome } from '@/components/features/home/counterparty-home'

export default async function HomePage() {
  const session = await requireUser()
  const ctx = { user: session }
  const [me, allDatasets, recentRuns, insights] = await Promise.all([
    getCurrentUser(ctx),
    listDatasets(ctx, {}),
    listRuns(ctx, {}),
    getCounterpartyInsights(ctx),
  ])
  const watched = allDatasets.filter((d) => d.watching)
  const org = fixtures.orgs.find((o) => o.id === me.orgId)!

  if (me.role === 'originator') {
    return (
      <div className="px-6 py-6 max-w-6xl mx-auto">
        <PageHeader
          eyebrow="// hyve · originator"
          title={`Welcome, ${me.name.split(' ')[0]}`}
          description={`${org.name} — Plan 03 fills this with originator home.`}
        />
      </div>
    )
  }

  const pending = [
    { id: 't1', title: 'Run #4823 awaiting your review', href: '/runs/run_4823', kind: 'run' },
    { id: 't2', title: 'Template "Default rate by vintage" needs changes', href: '/templates/tpl_default_rate_by_vintage', kind: 'template' },
  ]

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="// home"
        title={`Welcome, ${me.name.split(' ')[0]}`}
        description={`Since you last signed in: ${recentRuns.length} runs, ${insights.filter((i) => !i.id.startsWith('ins_dismissed_')).length} new insights.`}
      />
      <div className="mt-6">
        <CounterpartyHome
          userName={me.name}
          watched={watched}
          recentRuns={recentRuns}
          insights={insights}
          pending={pending}
        />
      </div>
    </div>
  )
}
