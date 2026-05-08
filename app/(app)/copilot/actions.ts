'use server'

import { requireUser } from '@/lib/auth/server'
import { streamCopilotReply, createCopilotThread } from '@/lib/api/endpoints/copilot'

export async function newThread(title: string) {
  await requireUser()
  return createCopilotThread({}, { title })
}

/**
 * Returns an AsyncIterable the client consumes via for-await.
 * Server Actions can return iterables; React 19 + Next 16 stream them across the wire.
 */
export async function sendMessageStream(threadId: string, text: string) {
  await requireUser()
  return streamCopilotReply(threadId, text)
}
