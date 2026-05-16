import { requireUser } from '@/lib/auth/server'
import { settings } from '@/lib/api/endpoints/settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ApiKeysTable } from '@/components/features/settings/api-keys-table'
import { CreateApiKeyDialog } from '@/components/features/settings/create-api-key-dialog'
import { WebhooksTable } from '@/components/features/settings/webhooks-table'
import { revokeApiKeyAction, toggleWebhookAction } from './actions'

export default async function IntegrationsPage() {
  const session = await requireUser()
  const ctx = { user: session }
  const [keys, webhooks] = await Promise.all([settings.listApiKeys(ctx), settings.listWebhooks(ctx)])

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">API keys</CardTitle>
          <CreateApiKeyDialog />
        </CardHeader>
        <CardContent>
          <ApiKeysTable keys={keys} onRevoke={async (id) => { 'use server'; await revokeApiKeyAction(id) }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">Webhooks</CardTitle></CardHeader>
        <CardContent>
          <WebhooksTable webhooks={webhooks} onToggle={async (id) => { 'use server'; await toggleWebhookAction(id) }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">SDK quick-start</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-xs">
{`# TypeScript
npm install @hyve/sdk

import { Hyve } from '@hyve/sdk'
const hyve = new Hyve({ apiKey: process.env.HYVE_API_KEY })
const run = await hyve.runs.execute({ templateId, datasetId, parameters })
console.log(run.result)`}
          </pre>
          <p className="text-xs text-muted-foreground">Smart-contract integration patterns live at <span className="font-mono">docs.hyve.xyz/contracts</span>.</p>
        </CardContent>
      </Card>
    </div>
  )
}
