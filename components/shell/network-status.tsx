'use client'

import { useEffect, useState } from 'react'
import { Activity } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { fmtDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { NetworkHealth } from '@/lib/api/types'
import { subscribe, Topics } from '@/lib/api/realtime'

type Props = { initial: NetworkHealth }

export function NetworkStatus({ initial }: Props) {
  const [health, setHealth] = useState(initial)

  useEffect(() => subscribe<NetworkHealth>(Topics.NETWORK_HEALTH, setHealth), [])

  const allHealthy =
    health.teeStatus === 'healthy' &&
    health.anchorStatus === 'healthy' &&
    health.ingestionStatus === 'healthy'

  const tone = allHealthy
    ? 'bg-success'
    : health.teeStatus === 'down' || health.anchorStatus === 'down' || health.ingestionStatus === 'down'
      ? 'bg-destructive'
      : 'bg-warning'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Network status"
          >
            <Activity className="size-3.5" />
            <span aria-hidden className={cn('inline-block size-1.5 rounded-full', tone)} />
          </button>
        </TooltipTrigger>
        <TooltipContent align="end" className="grid gap-1 text-xs">
          <p>TEE: {health.teeStatus}</p>
          <p>Anchor: {health.anchorStatus} ({fmtDuration(health.anchorLatencyMs)} latency)</p>
          <p>Ingestion: {health.ingestionStatus}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
