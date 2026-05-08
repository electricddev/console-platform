'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Template } from '@/lib/api/types'
import { useRouter } from 'next/navigation'

type Props = {
  template: Template
  approvedDatasetIds: string[]
  onRun: (input: {
    templateId: string
    datasetId: string
    parameters: Record<string, unknown>
  }) => Promise<{ id: string }>
}

export function RunTemplateDialog({ template, approvedDatasetIds, onRun }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [datasetId, setDatasetId] = useState(approvedDatasetIds[0] ?? '')
  const [params, setParams] = useState<Record<string, string>>(
    Object.fromEntries(
      template.parameters.map((p) => [p.name, String(p.defaultValue ?? '')])
    )
  )
  const [isPending, start] = useTransition()

  function run() {
    start(async () => {
      const parsed = Object.fromEntries(
        template.parameters.map((p) => [
          p.name,
          p.type === 'number' ? Number(params[p.name]) : params[p.name],
        ])
      )
      const r = await onRun({ templateId: template.id, datasetId, parameters: parsed })
      setOpen(false)
      router.push(`/runs/${r.id}`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={approvedDatasetIds.length === 0}>Run</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run {template.name}</DialogTitle>
          <DialogDescription>
            Pick an approved dataset and set parameters.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Dataset</Label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {approvedDatasetIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
          {template.parameters.map((p) => (
            <div key={p.name} className="grid gap-1.5">
              <Label htmlFor={`p-${p.name}`}>
                {p.name}{' '}
                <span className="text-xs text-muted-foreground">({p.type})</span>
              </Label>
              <Input
                id={`p-${p.name}`}
                value={params[p.name] ?? ''}
                onChange={(e) => setParams({ ...params, [p.name]: e.target.value })}
              />
              {p.description && (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={run} disabled={isPending}>
              {isPending ? 'Queuing…' : 'Run'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
