import { Suspense } from 'react'
import { requireUser } from '@/lib/auth/server'
import { listDatasets } from '@/lib/api/endpoints/datasets'
import { PageHeader } from '@/components/common/page-header'
import { DatasetFilters } from './_components/dataset-filters'
import { DatasetTable } from './_components/dataset-table'
import type { AssetClass } from '@/lib/api/types'

type Search = { q?: string; class?: string; status?: string }

export default async function DatasetsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireUser()
  const sp = await searchParams
  const datasets = await listDatasets(
    { user: session },
    {
      search: sp.q,
      assetClass: (sp.class && sp.class !== 'all') ? (sp.class as AssetClass) : undefined,
      status: (sp.status && sp.status !== 'all') ? (sp.status as 'active' | 'paused' | 'archived') : undefined,
    }
  )

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// catalog"
        title="Datasets"
        description="Browse all datasets you have access to. Click any row to drill into schema, templates, runs, and lineage."
      />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[16rem_minmax(0,1fr)] gap-4">
        <div className="rounded-lg border border-border bg-surface/40">
          <Suspense fallback={null}>
            <DatasetFilters />
          </Suspense>
        </div>
        <DatasetTable datasets={datasets} />
      </div>
    </div>
  )
}
