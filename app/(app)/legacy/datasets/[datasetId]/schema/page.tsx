import { requireUser } from '@/lib/auth/server'
import { getDatasetSchema } from '@/lib/api/endpoints/datasets'
import { SchemaTree } from '@/components/features/datasets/schema-tree'
import { KeyValue } from '@/components/common/key-value'
import { fmtDate, fmtNumber } from '@/lib/format'
import { CopyableHash } from '@/components/common/copyable-hash'

export default async function SchemaTab({ params }: { params: Promise<{ datasetId: string }> }) {
  const { datasetId } = await params
  const session = await requireUser()
  const schema = await getDatasetSchema({ user: session }, datasetId)

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 md:grid-cols-4 rounded-lg border border-border bg-surface/40 p-4">
        <KeyValue label="Schema version" value={`v${schema.version}`} />
        <KeyValue label="Published" value={fmtDate(schema.publishedAt)} />
        <KeyValue label="Signed by" value={<CopyableHash value={schema.signedBy} />} />
        <KeyValue label="K-anonymity" value={fmtNumber(schema.policy.kAnonymity)} />
        <KeyValue label="Daily query cap" value={fmtNumber(schema.policy.maxQueriesPerCounterpartyPerDay)} />
        <KeyValue label="Time ranges" value={schema.policy.allowedTimeRanges?.join(', ') ?? '—'} />
        {schema.changeSummary && (
          <KeyValue className="md:col-span-4" label="Change summary" value={schema.changeSummary} />
        )}
      </section>
      <SchemaTree schema={schema} />
    </div>
  )
}
