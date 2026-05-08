import { requireUser } from '@/lib/auth/server'
import { listSchemaVersions } from '@/lib/api/endpoints/schemas-endpoint'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { SchemaVersionDiff } from '@/components/features/schemas/schema-version-diff'

export default async function SchemaVersions({
  params,
}: {
  params: Promise<{ schemaId: string }>
}) {
  const { schemaId } = await params
  const session = await requireUser()
  const current = fixtures.schemas.find((s) => s.id === schemaId)
  if (!current) throw new Error('Schema not found')
  const versions = await listSchemaVersions({ user: session }, current.datasetId)
  if (versions.length < 2) {
    return (
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <PageHeader
          eyebrow="// versions"
          title="Schema versions"
          description="Only one version on file."
        />
      </div>
    )
  }
  const next = versions[0]
  const prev = versions[1]
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow="// versions"
        title={`v${prev.version} → v${next.version}`}
        description={next.changeSummary}
      />
      <div className="mt-6">
        <SchemaVersionDiff prev={prev} next={next} />
      </div>
    </div>
  )
}
