'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import type { Schema, SchemaField } from '@/lib/api/types'

type Props = {
  initial: Schema
  onSave: (next: Schema) => Promise<{ id: string }>
  onPublish: (id: string) => Promise<{ version: number }>
}

export function SchemaEditor({ initial, onSave, onPublish }: Props) {
  const [schema, setSchema] = useState<Schema>(initial)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function setField(idx: number, patch: Partial<SchemaField>) {
    setSchema((s) => {
      const fields = s.fields.map((f, i) => (i === idx ? { ...f, ...patch } : f))
      return { ...s, fields }
    })
  }

  async function save() {
    setBusy(true)
    try {
      const r = await onSave(schema)
      setDraftId(r.id)
    } finally {
      setBusy(false)
    }
  }

  async function publish() {
    if (!draftId) return
    setBusy(true)
    try {
      await onPublish(draftId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Fields</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {schema.fields.map((f, i) => (
          <div
            key={f.name}
            className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-3 rounded-md border border-border/60 bg-surface/30 p-3"
          >
            <div className="grid gap-1">
              <Label className="text-xs" htmlFor={`field-name-${i}`}>
                Name
              </Label>
              <Input
                id={`field-name-${i}`}
                value={f.name}
                disabled
                className="font-mono text-xs"
              />
            </div>

            <div className="grid gap-1">
              <Label className="text-xs" htmlFor={`field-exposure-${i}`}>
                Exposure
              </Label>
              <Select
                value={f.exposure}
                onValueChange={(v) =>
                  setField(i, { exposure: v as SchemaField['exposure'] })
                }
              >
                <SelectTrigger id={`field-exposure-${i}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="queryable">queryable</SelectItem>
                  <SelectItem value="aggregated-only">aggregated-only</SelectItem>
                  <SelectItem value="private">private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1">
              <Label className="text-xs" htmlFor={`field-bucket-${i}`}>
                Min bucket
              </Label>
              <Input
                id={`field-bucket-${i}`}
                type="number"
                value={f.minBucketSize ?? ''}
                onChange={(e) =>
                  setField(i, {
                    minBucketSize:
                      e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
              />
            </div>

            <div className="grid gap-1 items-center">
              <Label className="text-xs" htmlFor={`field-pii-${i}`}>
                PII
              </Label>
              <Switch
                id={`field-pii-${i}`}
                checked={f.isPii}
                onCheckedChange={(v) => setField(i, { isPii: v })}
              />
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save draft'}
          </Button>
          <Button onClick={publish} disabled={!draftId || busy}>
            Publish (sign)
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
