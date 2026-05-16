import { requireUser } from '@/lib/auth/server'
import { listIssuers } from '@/lib/api/endpoints/issuers'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { IssuerTable } from '@/components/features/issuers/issuer-table'

export default async function IssuersPage() {
  const session = await requireUser()
  const issuers = await listIssuers({ user: session })
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// portfolio"
        title="Issuers"
        description="Compliance, SLA performance, and request history for every issuer in your portfolio."
      />
      <div className="mt-6">
        <IssuerTable issuers={issuers} orgs={fixtures.orgs} />
      </div>
    </div>
  )
}
