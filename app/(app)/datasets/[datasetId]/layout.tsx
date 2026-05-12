import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { TabLink } from './_components/tab-link'
import { getDataset } from '@/lib/api/endpoints/datasets'
import type { Dataset } from '@/lib/api/schemas'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'

function tabsFor(ds: Dataset) {
  const base: Array<{ href: string; label: string }> = [{ href: '', label: 'Overview' }]
  if (ds.tables && ds.tables.length > 0) {
    base.push({ href: '/explore', label: 'Explore' })
  }
  if (ds.id === 'ds_acred') {
    base.push({ href: '/memo', label: 'Memo' })
    base.push({ href: '/amm',  label: 'AMM' })
  }
  base.push(
    { href: '/schema', label: 'Schema' },
    { href: '/templates', label: 'Templates' },
    { href: '/runs', label: 'Runs' },
    { href: '/lineage', label: 'Lineage' },
  )
  return base
}

export default async function DatasetLayout({ children, params }: LayoutProps<'/datasets/[datasetId]'>) {
  const { datasetId } = await params
  const session = await requireUser()
  const ds = await getDataset({ user: session }, datasetId)
  const org = fixtures.orgs.find((o) => o.id === ds.originatorOrgId)

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// dataset · ${ds.assetClass}`}
        title={
          <span className="flex items-center gap-2">
            {ds.name}
            <AttestationBadge attestation={ds.attestation} />
            <FreshnessIndicator timestamp={ds.lastAttestedAt} />
          </span>
        }
        description={
          <span>
            <span className="font-medium text-foreground">{org?.name ?? ds.originatorOrgId}</span>
            {' · '}
            <span>{ds.description}</span>
          </span>
        }
        actions={
          <Button asChild>
            <Link href={`/templates/new?dataset=${datasetId}`}>Propose new template</Link>
          </Button>
        }
      />

      <nav className="mt-6 flex gap-1 border-b border-border" aria-label="Dataset sections">
        {tabsFor(ds).map((t) => (
          <TabLink key={t.label} href={`/datasets/${datasetId}${t.href}`}>
            {t.label}
          </TabLink>
        ))}
      </nav>

      <div className="mt-6">{children}</div>

      <p className="sr-only">
        Status: {ds.status}. Records: {ds.recordCount}.
      </p>
      <Badge className="sr-only">{ds.status}</Badge>
    </div>
  )
}
