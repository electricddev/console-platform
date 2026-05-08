'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Props = {
  approvalId: string
  onApprove: (id: string) => Promise<void>
  onDeny: (id: string, rationale: string) => Promise<void>
  onRequestChanges: (id: string, rationale: string) => Promise<void>
}

export function ApprovalDecisionBar({ approvalId, onApprove, onDeny, onRequestChanges }: Props) {
  const [reason, setReason] = useState('')
  const [, start] = useTransition()
  const router = useRouter()

  function approve() {
    start(async () => {
      await onApprove(approvalId)
      router.refresh()
    })
  }

  function deny() {
    if (!reason) return
    start(async () => {
      await onDeny(approvalId, reason)
      router.refresh()
    })
  }

  function requestChanges() {
    if (!reason) return
    start(async () => {
      await onRequestChanges(approvalId, reason)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border bg-surface/40 p-4">
      <div className="grid flex-1 gap-1.5 min-w-64">
        <Label htmlFor="reason">Reason (required for deny / request changes)</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter rationale…"
        />
      </div>
      <Button onClick={approve}>Approve &amp; sign</Button>
      <Button variant="outline" onClick={requestChanges} disabled={!reason}>
        Request changes
      </Button>
      <Button variant="destructive" onClick={deny} disabled={!reason}>
        Deny
      </Button>
    </div>
  )
}
