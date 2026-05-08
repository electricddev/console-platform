import { Bot, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CopyableHash } from '@/components/common/copyable-hash'
import { ConfidenceMeter } from './confidence-meter'
import { fmtRelativeTime } from '@/lib/format'
import type { CopilotMessage } from '@/lib/api/types'

export function MessageBubble({ message }: { message: CopilotMessage }) {
  const isAssistant = message.role === 'assistant'
  return (
    <div className={cn('flex gap-3', isAssistant ? 'flex-row' : 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full',
          isAssistant ? 'bg-accent/15 text-accent-foreground' : 'bg-muted'
        )}
      >
        {isAssistant ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
      </div>
      <div
        className={cn(
          'max-w-[36rem] grid gap-1.5 rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-sm',
          isAssistant ? '' : 'bg-muted'
        )}
      >
        <p className="whitespace-pre-wrap leading-snug">{message.text}</p>
        {isAssistant && message.evidenceRunIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="font-tag">{'// evidence:'}</span>
            {message.evidenceRunIds.map((rid) => (
              <CopyableHash key={rid} value={rid} />
            ))}
          </div>
        )}
        {isAssistant && typeof message.confidence === 'number' && (
          <ConfidenceMeter value={message.confidence} />
        )}
        <p className="text-[0.65rem] text-muted-foreground">{fmtRelativeTime(message.createdAt)}</p>
      </div>
    </div>
  )
}
