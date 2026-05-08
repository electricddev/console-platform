import { requireUser } from '@/lib/auth/server'
import { getDatasetLineage } from '@/lib/api/endpoints/datasets'
import { LineageFlow } from '@/components/features/datasets/lineage-flow'

export default async function LineageTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const lineage = await getDatasetLineage({ user: session }, datasetId)

  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <h2 className="font-tag text-foreground/60">// data flow</h2>
        <LineageFlow lineage={lineage} />
      </section>
      <section className="grid gap-2">
        <h2 className="font-tag text-foreground/60">// stream completeness</h2>
        <p className="text-sm text-muted-foreground">
          Plan 06 fills in the live completeness graph with attestation markers.
        </p>
      </section>
    </div>
  )
}
