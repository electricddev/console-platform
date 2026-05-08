'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtHash } from '@/lib/format'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

type Props = {
  value: string
  short?: boolean
  className?: string
}

export function CopyableHash({ value, short = true, className }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // Older browsers; no-op for now.
    }
  }

  const display = short ? fmtHash(value) : value

  return (
    <TooltipProvider delayDuration={120}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={copy}
            className={cn(
              'group inline-flex items-center gap-1 rounded font-mono text-[0.75rem] tabular-nums text-muted-foreground hover:text-foreground transition-colors',
              className
            )}
          >
            <span>{display}</span>
            {copied ? (
              <Check className="size-3 text-success" />
            ) : (
              <Copy className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono text-xs">{copied ? 'Copied' : value}</span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
