import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { CopilotThreadSchema } from '@/lib/api/schemas'
import type { CopilotThread, CopilotMessage } from '@/lib/api/types'

const state: CopilotThread[] = fixtures.copilotThreads.map((t) => ({ ...t, messages: t.messages.map((m) => ({ ...m })) }))

export const listCopilotThreads = mockEndpoint(
  async (): Promise<CopilotThread[]> => state.map((t) => CopilotThreadSchema.parse(t)),
  { latencyMs: 100 }
)

export const getCopilotThread = mockEndpoint(
  async (_ctx: RequestContext, _signal, id: string): Promise<CopilotThread> => {
    const t = state.find((x) => x.id === id)
    if (!t) throw new MockApiError('Thread not found', 404)
    return CopilotThreadSchema.parse(t)
  },
  { latencyMs: 100 }
)

export const createCopilotThread = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { title: string }): Promise<CopilotThread> => {
    const id = 'th_' + Math.random().toString(36).slice(2, 8)
    const t: CopilotThread = { id, title: input.title, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), messages: [] }
    state.unshift(t)
    return CopilotThreadSchema.parse(t)
  },
  { latencyMs: 200 }
)

/** Streaming send. Yields token chunks; the final yield includes the persisted message. */
export function streamCopilotReply(threadId: string, userText: string): AsyncIterable<{ chunk?: string; done?: CopilotMessage }> {
  const t = state.find((x) => x.id === threadId)
  if (!t) throw new MockApiError('Thread not found', 404)
  const userMsg: CopilotMessage = {
    id: 'm_' + Math.random().toString(36).slice(2, 8),
    role: 'user', text: userText, createdAt: new Date().toISOString(),
    evidenceRunIds: [], toolCalls: [],
  }
  t.messages.push(userMsg)

  const reply = `I'll check that on the underlying datasets. Per Run #run_4822 (anchor 0xabc…), Industrials currently at 22.4%, below threshold but trending up.`

  return {
    [Symbol.asyncIterator]: async function* () {
      // Stream the text 8 chars at a time.
      for (let i = 0; i < reply.length; i += 8) {
        await new Promise((r) => setTimeout(r, 24))
        yield { chunk: reply.slice(i, i + 8) }
      }
      const assistantMsg: CopilotMessage = {
        id: 'm_' + Math.random().toString(36).slice(2, 8),
        role: 'assistant', text: reply, createdAt: new Date().toISOString(),
        evidenceRunIds: ['run_4822'], confidence: 0.88,
        toolCalls: [{ kind: 'execute-template', input: { templateId: 'tpl_concentration_breaches' }, output: { runId: 'run_4822' } }],
      }
      t.messages.push(assistantMsg)
      t.updatedAt = new Date().toISOString()
      yield { done: assistantMsg }
    },
  }
}
