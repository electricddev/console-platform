'use client'
import { Button } from '@/components/ui/button'
import type { MemoStatus, Role } from '@/lib/api/schemas'

type Props = {
  memoStatus: MemoStatus
  userRole: Role
  onSubmit: () => void
  onApprove: () => void
  onRequestChanges: () => void
}

const statusLabel: Record<MemoStatus, string> = {
  draft: 'Draft', submitted: 'Submitted for IC review', approved: 'Approved',
}

export function MemoStatusBar({ memoStatus, userRole, onSubmit, onApprove, onRequestChanges }: Props) {
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-surface/40 p-3">
      <p className="font-tag text-xs uppercase tracking-wider text-foreground/55">{statusLabel[memoStatus]}</p>
      <div className="flex gap-2">
        {memoStatus === 'draft' && userRole !== 'originator' && (
          <Button onClick={onSubmit}>Submit for IC review</Button>
        )}
        {memoStatus === 'submitted' && userRole === 'admin' && (
          <>
            <Button variant="outline" onClick={onRequestChanges}>Request changes</Button>
            <Button onClick={onApprove}>Approve</Button>
          </>
        )}
      </div>
    </div>
  )
}
