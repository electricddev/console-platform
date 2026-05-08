'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save } from 'lucide-react'
import { NlInput } from './nl-input'
import { DslEditor } from './dsl-editor'
import { PrivacyAnalysisPanel } from './privacy-analysis-panel'
import { SimulationPanel } from './simulation-panel'
import type { PrivacyAnalysis } from '@/lib/api/endpoints/ai'

type Props = {
  datasetId: string
  schemaId: string
  initialPrompt?: string
  initialDsl?: string
  initialName?: string
  onCompileStream: (prompt: string, datasetId: string) => AsyncIterable<string>
  onPrivacyAnalysis: (input: { dsl: string; schemaId: string }) => Promise<PrivacyAnalysis>
  onSaveDraft: (input: { name: string; description: string; dsl: string }) => Promise<{ id: string }>
}

export function ComposerShell(props: Props) {
  const [name, setName] = useState(props.initialName ?? '')
  const [description, setDescription] = useState('')
  const [dsl, setDsl] = useState(props.initialDsl ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (saving) return
    setSaving(true)
    try {
      const result = await props.onSaveDraft({ name, description, dsl })
      window.location.assign(`/templates/${result.id}`)
    } finally {
      setSaving(false)
    }
  }

  const canSave = name.trim().length > 0 && dsl.trim().length > 0 && !saving

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_22rem] gap-6">
      {/* Left pane: NL input + DSL editor + Metadata */}
      <section className="grid gap-4 content-start">
        <NlInput
          datasetId={props.datasetId}
          onCompileStream={props.onCompileStream}
          onCompiled={setDsl}
        />

        <Card>
          <CardHeader className="border-b [.border-b]:pb-3">
            <CardTitle className="text-sm font-medium">DSL editor</CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <DslEditor value={dsl} onChange={setDsl} height={320} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b [.border-b]:pb-3">
            <CardTitle className="text-sm font-medium">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 pt-3">
            <div className="grid gap-1.5">
              <Label htmlFor="t-name">Name</Label>
              <Input
                id="t-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Weighted advance rate by sector"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="t-desc">Description</Label>
              <Input
                id="t-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Plain-language explanation of what this template answers"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={save}
            disabled={!canSave}
          >
            <Save className="size-3.5" />
            Save draft
          </Button>
        </div>
      </section>

      {/* Right pane: Privacy analysis + Simulation */}
      <aside className="grid gap-4 content-start">
        <PrivacyAnalysisPanel
          dsl={dsl}
          schemaId={props.schemaId}
          fetchAnalysis={props.onPrivacyAnalysis}
        />
        <SimulationPanel datasetId={props.datasetId} />
      </aside>
    </div>
  )
}
