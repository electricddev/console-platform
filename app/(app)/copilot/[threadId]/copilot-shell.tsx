'use client'

import { useState } from 'react'
import { ThreadList } from '../_components/thread-list'
import { Composer } from '../_components/composer'
import { MessageStream } from '../_components/message-stream'
import type { CopilotThread, CopilotMessage } from '@/lib/api/types'

type Props = { initialThread: CopilotThread; threads: CopilotThread[] }

export function CopilotShell({ initialThread, threads }: Props) {
  const [thread, setThread] = useState(initialThread)
  const [pending, setPending] = useState<{ text: string } | null>(null)

  function send(text: string) {
    setThread((t) => ({
      ...t,
      messages: [
        ...t.messages,
        {
          id: 'm_local_' + Date.now(),
          role: 'user',
          text,
          createdAt: new Date().toISOString(),
          evidenceRunIds: [],
          toolCalls: [],
        },
      ],
    }))
    setPending({ text })
  }

  function onPersisted(msg: CopilotMessage) {
    setThread((t) => ({ ...t, messages: [...t.messages, msg] }))
    setPending(null)
  }

  return (
    <div className="grid h-[calc(100vh-var(--topbar-height))] grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="border-r border-border bg-surface/40">
        <ThreadList threads={threads} currentId={thread.id} />
      </aside>
      <section className="flex min-h-0 flex-col">
        <div className="flex-1 overflow-auto p-6">
          <MessageStream
            threadId={thread.id}
            initial={thread.messages}
            pending={pending}
            onPersisted={onPersisted}
          />
        </div>
        <Composer onSend={send} />
      </section>
    </div>
  )
}
