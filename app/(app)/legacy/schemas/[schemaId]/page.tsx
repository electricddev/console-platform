import { requireUser } from '@/lib/auth/server'
import { getSchema, saveSchemaDraft, publishSchema } from '@/lib/api/endpoints/schemas-endpoint'
import { PageHeader } from '@/components/common/page-header'
import { SchemaEditor } from '@/components/features/schemas/schema-editor'
import { PrivacyAdvisorPanel } from '@/components/features/schemas/privacy-advisor-panel'
import type { Schema } from '@/lib/api/types'

export default async function SchemaPage({
  params,
}: {
  params: Promise<{ schemaId: string }>
}) {
  const { schemaId } = await params
  const session = await requireUser()
  const schema = await getSchema({ user: session }, schemaId)

  async function handleSave(next: Schema): Promise<{ id: string }> {
    'use server'
    const s = await requireUser()
    const saved = await saveSchemaDraft({ user: s }, next)
    return { id: saved.id }
  }

  async function handlePublish(id: string): Promise<{ version: number }> {
    'use server'
    const s = await requireUser()
    const published = await publishSchema({ user: s }, id)
    return { version: published.version }
  }

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader
        eyebrow={`// schema · v${schema.version}`}
        title={schema.id}
        description={`Dataset ${schema.datasetId} · k-anonymity ${schema.policy.kAnonymity}`}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <SchemaEditor
          initial={schema}
          onSave={handleSave}
          onPublish={handlePublish}
        />
        <PrivacyAdvisorPanel schema={schema} />
      </div>
    </div>
  )
}
