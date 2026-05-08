import Link from 'next/link'
import type { ReactNode } from 'react'
import { requireUser } from '@/lib/auth/server'
import { getDataset } from '@/lib/api/endpoints/datasets'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'

type Props = {
  children: ReactNode
  params: Promise<{ datasetId: string }>
}

const TABS = [
  { href: '', label: 'Overview' },
  { href: '/schema', label: 'Schema' },
  { href: '/templates', label: 'Templates' },
  { href: '/runs', label: 'Runs' },
  { href: '/lineage', label: 'Lineage' },
] as const

export default async function DatasetLayout({ children, params }: Props) {
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
        {TABS.map((t) => (
          <Link
            key={t.label}
            href={`/datasets/${datasetId}${t.href}`}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
          >
            {t.label}
          </Link>
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
