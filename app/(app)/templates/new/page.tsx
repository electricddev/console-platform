import { requireUser } from '@/lib/auth/server'
import { getDataset, getDatasetSchema } from '@/lib/api/endpoints/datasets'
import { ai } from '@/lib/api/endpoints/ai'
import { draftTemplate } from '@/lib/api/endpoints/templates'
import { ComposerShell } from '@/components/features/templates/composer/composer-shell'

type Search = { dataset?: string; prompt?: string }

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<Search>
}) {
  const session = await requireUser()
  const sp = await searchParams
  const datasetId = sp.dataset ?? 'ds_mfone'
  const ds = await getDataset({ user: session }, datasetId).catch(() => null)
  const schemaId = ds?.schemaId ?? 'sch_mfone_v3'

  // Fetch schema for the schema browser + HQL autocomplete
  const schema = await getDatasetSchema({ user: session }, datasetId).catch(() => null)

  return (
    <ComposerShell
      datasetId={datasetId}
      schemaId={schemaId}
      schema={schema}
      initialPrompt={sp.prompt}
      onCompileStream={async function* (prompt, dsId) {
        'use server'
        const stream = ai.compileTemplate({ user: session }, { prompt, datasetId: dsId })
        for await (const chunk of stream) yield chunk
      }}
      onPrivacyAnalysis={async (input) => {
        'use server'
        return ai.privacyAnalysis({ user: session }, input)
      }}
      onSaveDraft={async (input) => {
        'use server'
        const t = await draftTemplate(
          { user: session },
          {
            name: input.name,
            description: input.description,
            dsl: input.dsl,
            parameters: [],
            outputSchema: { shape: 'tabular', columns: [] },
          }
        )
        return { id: t.id }
      }}
      onSubmit={async (input) => {
        'use server'
        console.log('submit', input)
        return { id: 'draft_pending' }
      }}
    />
  )
}
