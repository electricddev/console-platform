import { requireUser } from '@/lib/auth/server'
import { getDatasetLineage } from '@/lib/api/endpoints/datasets'
import { FullLineageGraph } from '@/components/features/datasets/full-lineage-graph'
import { CompletenessGraph } from '@/components/features/datasets/completeness-graph'

export default async function LineageTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const lineage = await getDatasetLineage({ user: session }, datasetId)

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h2 className="font-tag text-foreground/60">{'// data flow'}</h2>
        <FullLineageGraph lineage={lineage} />
      </section>
      <section className="grid gap-2">
        <h2 className="font-tag text-foreground/60">{'// stream completeness'}</h2>
        <CompletenessGraph />
      </section>
    </div>
  )
}
