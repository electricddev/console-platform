import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { getIssuer, listIssuerRequests } from '@/lib/api/endpoints/issuers'
import { fixtures } from '@/lib/api/fixtures'
import { IssuerDetailHeader } from '@/components/features/issuers/issuer-detail-header'
import { IssuerAssetRoster } from '@/components/features/issuers/issuer-asset-roster'
import { IssuerSlaTable } from '@/components/features/issuers/issuer-sla-table'
import { IssuerActionPanel } from '@/components/features/issuers/issuer-action-panel'
import { IssuerRequestLog } from '@/components/features/issuers/issuer-request-log'
import { actionSubmitIssuerRequest } from '@/app/(app)/legacy/issuers/actions'

export default async function IssuerDetailPage({ params }: { params: Promise<{ issuerId: string }> }) {
  const { issuerId } = await params
  const session = await requireUser()
  const [compliance, requests] = await Promise.all([
    getIssuer({ user: session }, issuerId).catch(() => null),
    listIssuerRequests({ user: session }, issuerId),
  ])
  if (!compliance) notFound()
  const org = fixtures.orgs.find((o) => o.id === issuerId)
  if (!org) notFound()
  const datasets = fixtures.datasets.filter((d) => compliance.assetIds.includes(d.id))

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto grid gap-6">
      <IssuerDetailHeader org={org} compliance={compliance} />
      <div className="grid gap-6 md:grid-cols-2">
        <IssuerAssetRoster datasets={datasets} />
        <IssuerSlaTable discipline={compliance.discipline} />
      </div>
      <IssuerActionPanel
        issuerId={issuerId}
        onSubmit={async (payload) => { 'use server'; await actionSubmitIssuerRequest(payload) }}
      />
      <IssuerRequestLog requests={requests} />
    </div>
  )
}
