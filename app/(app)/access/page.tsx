import { requireUser } from '@/lib/auth/server'
import { listGrants } from '@/lib/api/endpoints/access'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { AccessMatrix } from '@/components/features/access/access-matrix'

export default async function AccessPage() {
  const session = await requireUser()
  const ctx = { user: session }
  const [grants, datasets] = await Promise.all([
    listGrants(ctx),
    listDatasets(ctx, { originatorOrgId: session.orgId }),
  ])
  const counterpartyIds = Array.from(new Set(grants.map((g) => g.counterpartyOrgId)))
  const counterparties = fixtures.orgs.filter((o) => counterpartyIds.includes(o.id))

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// permissions"
        title="Counterparty access"
        description="Who can do what against your datasets. Time-bounded, rate-limited, revocable in one click."
      />
      <div className="mt-6">
        <AccessMatrix datasets={datasets} counterparties={counterparties} grants={grants} />
      </div>
    </div>
  )
}
