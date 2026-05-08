"use client"

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { TemplateApproval } from '@/lib/api/types'

const TONE: Record<TemplateApproval['state'], string> = {
  approved: 'bg-success/15 text-success border-success/30',
  pending: 'bg-warning/15 text-warning border-warning/30',
  denied: 'bg-destructive/15 text-destructive border-destructive/30',
  'changes-requested': 'bg-info/15 text-info border-info/30',
  unsubmitted: 'bg-muted text-muted-foreground border-border',
}

export function ApprovalStatusCluster({ approvals }: { approvals: TemplateApproval[] }) {
  if (approvals.length === 0) return <span className="text-xs text-muted-foreground">none</span>
  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-wrap gap-1">
        {approvals.map((a) => (
          <Tooltip key={a.datasetId}>
            <TooltipTrigger asChild>
              <Badge variant="outline" className={`font-tag text-[0.6rem] ${TONE[a.state]}`}>
                {a.datasetId}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">{a.datasetId}: <strong>{a.state}</strong></p>
              {a.rationale && <p className="text-xs text-muted-foreground">{a.rationale}</p>}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
