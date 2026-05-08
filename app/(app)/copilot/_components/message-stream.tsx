'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Bot } from 'lucide-react'
import { sendMessageStream } from '@/app/(app)/copilot/actions'
import { MessageBubble } from '@/components/features/copilot/message-bubble'
import type { CopilotMessage } from '@/lib/api/types'

type Props = {
  threadId: string
  initial: CopilotMessage[]
  pending?: { text: string } | null
  onPersisted: (msg: CopilotMessage) => void
}

export function MessageStream({ threadId, initial, pending, onPersisted }: Props) {
  const [streaming, setStreaming] = useState('')
  const [, start] = useTransition()
  const handled = useRef<string | null>(null)

  useEffect(() => {
    if (!pending || handled.current === pending.text) return
    handled.current = pending.text
    setStreaming('')
    start(async () => {
      const stream = await sendMessageStream(threadId, pending.text)
      for await (const event of stream) {
        if (event.chunk) setStreaming((s) => s + event.chunk)
        if (event.done) {
          setStreaming('')
          onPersisted(event.done)
        }
      }
    })
  }, [pending, threadId, onPersisted])

  return (
    <div className="grid gap-4">
      {initial.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      {streaming && (
        <div className="flex gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-accent/15">
            <Bot className="size-3.5" />
          </div>
          <div className="max-w-[36rem] rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap leading-snug">
              {streaming}
              <span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-foreground/40 align-middle" />
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
