# Plan 06 — V2: Copilot, Notebooks, Lineage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the V2 surfaces from spec §7.2 — the Conversational AI Copilot at `/copilot`, the Notebook surface at `/notebooks` and `/notebooks/[id]`, and the full Lineage graph that replaces the Plan 02 placeholder. Plus edge-state polish (offline/maintenance status banner) and the schema version diff viewer.

**Architecture:** Builds on Plans 01–05. Adds streaming chat (Server-Sent Events via Server Actions returning AsyncIterable, consumed in client components with `useTransition` + state). Notebook cells are server-rendered with client-only edit shells. Lineage graph uses `reactflow` for pan/zoom + node hover. Status banner reads from a public stub endpoint and renders in the topbar when not green.

**Tech Stack:** Plan 02 stack + `reactflow` for the lineage graph + a tiny Server-Sent stream helper for Copilot.

**Source spec sections:** §4.7 AI Copilot, §4.8 Notebooks, §4.4 (Lineage tab), §4.12 (Maintenance/Outage banner).

**Prerequisites:** Plans 01–05 merged.

---

## File structure

### New files

```
app/(app)/
  copilot/
    page.tsx                                Workspace shell (threads + canvas)
    [threadId]/page.tsx
    actions.ts
    _components/
      thread-list.tsx
      message-stream.tsx
      composer.tsx
      working-canvas.tsx
  notebooks/
    page.tsx                                List
    new/page.tsx
    [notebookId]/
      page.tsx                              Notebook view
      edit/page.tsx
      actions.ts
components/features/
  copilot/
    message-bubble.tsx
    inline-attestation-link.tsx
    confidence-meter.tsx
    suggested-queries.tsx
  notebooks/
    cell-markdown.tsx
    cell-query.tsx
    cell-visualization.tsx
    cell-attestation.tsx
    notebook-toolbar.tsx
    notebook-export-menu.tsx
  datasets/
    full-lineage-graph.tsx                  Replaces simple lineage flow
    completeness-graph.tsx                  recharts time series
  schemas/
    schema-version-diff.tsx                 (the polished diff viewer)
  shell/
    status-banner.tsx                       Maintenance / outage banner
lib/api/
  schemas.ts                                (extend) Notebook, NotebookCell, CopilotThread, CopilotMessage, StatusReport
  fixtures/
    notebooks.ts
    copilot.ts
    status.ts
    (extend) index.ts
  endpoints/
    notebooks.ts
    copilot.ts                              listThreads, getThread, sendMessage (streaming)
    status.ts
tests/
  unit/api/{notebooks,copilot,status}.test.ts
  e2e/copilot.spec.ts
  e2e/notebooks.spec.ts
```

### Modified files

- `lib/api/schemas.ts` — add notebook + copilot + status types
- `app/(app)/datasets/[datasetId]/lineage/page.tsx` — swap simple flow for `<FullLineageGraph>`
- `components/shell/topbar.tsx` — render `<StatusBanner>` above the topbar when status is non-green
- `package.json` — add `reactflow` and `marked` (for notebook markdown rendering)

---

## Task 1: Install deps and extend schemas

- [ ] **Step 1: Deps**

```bash
npm install reactflow@^11 marked@^12
```

- [ ] **Step 2: Append to `lib/api/schemas.ts`**

```ts
// ---------- Notebooks ----------

export const NotebookCellSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string(), kind: z.literal('markdown'), markdown: z.string() }),
  z.object({ id: z.string(), kind: z.literal('query'), templateId: z.string().optional(), dsl: z.string(), parameters: z.record(z.unknown()).default({}), runId: z.string().optional() }),
  z.object({ id: z.string(), kind: z.literal('visualization'), runId: z.string(), shape: z.enum(['bar', 'line', 'distribution']) }),
  z.object({ id: z.string(), kind: z.literal('attestation'), runIds: z.array(z.string()).min(1) }),
])
export type NotebookCell = z.infer<typeof NotebookCellSchema>

export const NotebookSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  authorId: z.string(),
  authorOrgId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  cells: z.array(NotebookCellSchema),
  shareToken: z.string().optional(),
})
export type Notebook = z.infer<typeof NotebookSchema>

// ---------- Copilot ----------

export const CopilotMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  text: z.string(),
  createdAt: z.string().datetime(),
  evidenceRunIds: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).optional(),
  toolCalls: z.array(z.object({
    kind: z.enum(['execute-template', 'list-datasets', 'compile-template']),
    input: z.unknown(),
    output: z.unknown().optional(),
  })).default([]),
})
export type CopilotMessage = z.infer<typeof CopilotMessageSchema>

export const CopilotThreadSchema = z.object({
  id: z.string(),
  title: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  messages: z.array(CopilotMessageSchema),
})
export type CopilotThread = z.infer<typeof CopilotThreadSchema>

// ---------- Status ----------

export const StatusReportSchema = z.object({
  overall: z.enum(['operational', 'degraded', 'outage']),
  components: z.array(z.object({
    name: z.string(),
    status: z.enum(['operational', 'degraded', 'outage']),
    message: z.string().optional(),
  })),
  updatedAt: z.string().datetime(),
})
export type StatusReport = z.infer<typeof StatusReportSchema>
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json lib/api/schemas.ts
git commit -m "feat(api): notebook, copilot, status schemas + reactflow/marked deps"
```

---

## Task 2: Build fixtures and endpoints

**Files:**
- Create: `lib/api/fixtures/notebooks.ts`, `copilot.ts`, `status.ts`
- Create: `lib/api/endpoints/notebooks.ts`, `copilot.ts`, `status.ts`
- Modify: `lib/api/fixtures/index.ts`

- [ ] **Step 1: Notebook fixtures**

```ts
// lib/api/fixtures/notebooks.ts
import type { Notebook } from '@/lib/api/types'

export const notebookFixtures: Notebook[] = [
  {
    id: 'nb_q2_credit_memo',
    title: 'Q2 2026 mF-ONE credit memo',
    description: 'IC-ready review of mF-ONE performance, vintage health, and concentration.',
    authorId: 'usr_maya',
    authorOrgId: 'org_gauntlet',
    createdAt: '2026-04-22T10:00:00Z',
    updatedAt: '2026-05-06T14:00:00Z',
    cells: [
      { id: 'c1', kind: 'markdown', markdown: '# Executive summary\n\nWe are recommending a position increase of $10M.' },
      { id: 'c2', kind: 'query', dsl: 'SELECT weighted_avg(advance_rate, principal) FROM loans GROUP BY sector', parameters: {}, runId: 'run_4821' },
      { id: 'c3', kind: 'visualization', runId: 'run_4822', shape: 'line' },
      { id: 'c4', kind: 'attestation', runIds: ['run_4821', 'run_4822'] },
    ],
  },
]
```

- [ ] **Step 2: Copilot fixtures**

```ts
// lib/api/fixtures/copilot.ts
import type { CopilotThread } from '@/lib/api/types'

export const copilotFixtures: CopilotThread[] = [
  {
    id: 'th_001',
    title: 'mF-ONE concentration check',
    createdAt: '2026-05-07T09:00:00Z',
    updatedAt: '2026-05-07T09:08:00Z',
    messages: [
      { id: 'm1', role: 'user', text: 'Is mF-ONE in concentration breach right now?', createdAt: '2026-05-07T09:00:00Z', evidenceRunIds: [], toolCalls: [] },
      { id: 'm2', role: 'assistant', text: 'No. Industrials sits at 22.4% (threshold 25%). Trending up though — projected breach in ~14 days at current rate.', createdAt: '2026-05-07T09:00:08Z', evidenceRunIds: ['run_4822'], confidence: 0.91, toolCalls: [{ kind: 'execute-template', input: { templateId: 'tpl_concentration_breaches' }, output: { runId: 'run_4822' } }] },
    ],
  },
]
```

- [ ] **Step 3: Status fixture**

```ts
// lib/api/fixtures/status.ts
import type { StatusReport } from '@/lib/api/types'

export const statusFixture: StatusReport = {
  overall: 'operational',
  components: [
    { name: 'TEE attestation', status: 'operational' },
    { name: 'On-chain anchor', status: 'operational' },
    { name: 'Ingestion', status: 'operational' },
  ],
  updatedAt: new Date().toISOString(),
}
```

- [ ] **Step 4: Wire all into `lib/api/fixtures/index.ts`**

Add `notebooks`, `copilotThreads`, `status` to the fixtures object.

- [ ] **Step 5: Endpoints — notebooks**

```ts
// lib/api/endpoints/notebooks.ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { NotebookSchema } from '@/lib/api/schemas'
import type { Notebook, NotebookCell } from '@/lib/api/types'

const state: Notebook[] = fixtures.notebooks.map((n) => ({ ...n, cells: n.cells.map((c) => ({ ...c })) }))

export const listNotebooks = mockEndpoint(
  async (_ctx: RequestContext): Promise<Notebook[]> => state.map((n) => NotebookSchema.parse(n)),
  { latencyMs: 140 }
)

export const getNotebook = mockEndpoint(
  async (_ctx: RequestContext, _signal, id: string): Promise<Notebook> => {
    const n = state.find((x) => x.id === id)
    if (!n) throw new MockApiError('Notebook not found', 404)
    return NotebookSchema.parse(n)
  },
  { latencyMs: 120 }
)

export const createNotebook = mockEndpoint(
  async (ctx: RequestContext, _signal, input: { title: string; description?: string }): Promise<Notebook> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'nb_' + Math.random().toString(36).slice(2, 8)
    const n: Notebook = {
      id, title: input.title, description: input.description,
      authorId: ctx.user.id, authorOrgId: ctx.user.orgId,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      cells: [{ id: 'c1', kind: 'markdown', markdown: '# ' + input.title }],
    }
    state.unshift(n)
    return NotebookSchema.parse(n)
  },
  { latencyMs: 200 }
)

export const updateNotebookCells = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { id: string; cells: NotebookCell[] }) => {
    const n = state.find((x) => x.id === input.id)
    if (!n) throw new MockApiError('Notebook not found', 404)
    n.cells = input.cells
    n.updatedAt = new Date().toISOString()
    return NotebookSchema.parse(n)
  },
  { latencyMs: 200 }
)
```

- [ ] **Step 6: Endpoints — copilot**

```ts
// lib/api/endpoints/copilot.ts
import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { CopilotThreadSchema } from '@/lib/api/schemas'
import type { CopilotThread, CopilotMessage } from '@/lib/api/types'

const state: CopilotThread[] = fixtures.copilotThreads.map((t) => ({ ...t, messages: t.messages.map((m) => ({ ...m })) }))

export const listCopilotThreads = mockEndpoint(
  async (_ctx: RequestContext): Promise<CopilotThread[]> => state.map((t) => CopilotThreadSchema.parse(t)),
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
```

- [ ] **Step 7: Endpoints — status**

```ts
// lib/api/endpoints/status.ts
import { mockQuery, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { StatusReportSchema } from '@/lib/api/schemas'
import type { StatusReport } from '@/lib/api/types'

export const getStatus = mockQuery<StatusReport>(
  (_ctx: RequestContext) => StatusReportSchema.parse(fixtures.status),
  { latencyMs: 60 }
)
```

- [ ] **Step 8: Round-trip + commit**

Append to `tests/unit/api/fixtures.test.ts` (notebook/copilot/status round-trips), then:

```bash
npm run test
git add lib/api/fixtures lib/api/endpoints/notebooks.ts lib/api/endpoints/copilot.ts lib/api/endpoints/status.ts tests/unit/api/fixtures.test.ts
git commit -m "feat(api): notebook + copilot + status endpoints and fixtures"
```

---

## Task 3: Build the status banner

**Files:**
- Create: `components/shell/status-banner.tsx`
- Modify: `components/shell/topbar.tsx`
- Modify: `components/shell/app-shell.tsx`

- [ ] **Step 1: Banner**

```tsx
import { TriangleAlert, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusReport } from '@/lib/api/types'

export function StatusBanner({ status }: { status: StatusReport }) {
  if (status.overall === 'operational') return null
  const tone = status.overall === 'degraded' ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'
  const Icon = status.overall === 'degraded' ? TriangleAlert : AlertOctagon
  const headline = status.overall === 'degraded' ? 'Partial degradation' : 'Outage'
  const detail = status.components.filter((c) => c.status !== 'operational').map((c) => `${c.name}: ${c.status}${c.message ? ` (${c.message})` : ''}`).join(' · ')

  return (
    <div className={cn('flex items-center gap-2 border-b px-3 py-1.5 text-xs', tone)}>
      <Icon className="size-3.5" />
      <span className="font-medium">{headline}.</span>
      <span className="text-foreground/70">{detail}</span>
      <a href="https://status.hyve.xyz" target="_blank" rel="noreferrer" className="ml-auto underline-offset-2 hover:underline">status.hyve.xyz</a>
    </div>
  )
}
```

- [ ] **Step 2: Mount in AppShell** (above the topbar)

Edit `components/shell/app-shell.tsx`. Accept `status: StatusReport` as a prop. Render `<StatusBanner status={status} />` immediately above `<Topbar …/>`.

Edit `app/(app)/layout.tsx` to fetch status:

```tsx
import { getStatus } from '@/lib/api/endpoints/status'
// inside the layout:
const status = await getStatus({ user: sessionUser })
// pass status={status} into <AppShell>
```

- [ ] **Step 3: Commit**

```bash
git add components/shell/status-banner.tsx components/shell/app-shell.tsx app/\(app\)/layout.tsx
git commit -m "feat(shell): status banner above topbar (degraded/outage only)"
```

---

## Task 4: Build the Copilot workspace

**Files:**
- Create: `app/(app)/copilot/page.tsx`
- Create: `app/(app)/copilot/[threadId]/page.tsx`
- Create: `app/(app)/copilot/actions.ts`
- Create: `app/(app)/copilot/_components/thread-list.tsx`
- Create: `app/(app)/copilot/_components/composer.tsx`
- Create: `app/(app)/copilot/_components/message-stream.tsx`
- Create: `components/features/copilot/message-bubble.tsx`
- Create: `components/features/copilot/confidence-meter.tsx`

- [ ] **Step 1: Server Action that opens a stream**

`app/(app)/copilot/actions.ts`:

```ts
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
```

- [ ] **Step 2: Confidence meter**

```tsx
// components/features/copilot/confidence-meter.tsx
import { cn } from '@/lib/utils'
import { fmtPct } from '@/lib/format'

export function ConfidenceMeter({ value }: { value: number }) {
  const tone = value > 0.8 ? 'bg-success' : value > 0.5 ? 'bg-warning' : 'bg-destructive'
  return (
    <div className="grid gap-0.5">
      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground">
        <span className="font-tag">// confidence</span>
        <span className="tabular-nums">{fmtPct(value)}</span>
      </div>
      <div className="h-1 rounded-full bg-muted">
        <div className={cn('h-1 rounded-full', tone)} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Message bubble**

```tsx
// components/features/copilot/message-bubble.tsx
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
      <div className={cn('flex size-7 shrink-0 items-center justify-center rounded-full', isAssistant ? 'bg-accent/15 text-accent-foreground' : 'bg-muted')}>
        {isAssistant ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
      </div>
      <div className={cn('max-w-[36rem] grid gap-1.5 rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-sm', isAssistant ? '' : 'bg-muted')}>
        <p className="whitespace-pre-wrap leading-snug">{message.text}</p>
        {isAssistant && message.evidenceRunIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <span className="font-tag">// evidence:</span>
            {message.evidenceRunIds.map((rid) => <CopyableHash key={rid} value={rid} />)}
          </div>
        )}
        {isAssistant && typeof message.confidence === 'number' && <ConfidenceMeter value={message.confidence} />}
        <p className="text-[0.65rem] text-muted-foreground">{fmtRelativeTime(message.createdAt)}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Streaming message component**

```tsx
// app/(app)/copilot/_components/message-stream.tsx
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
      {initial.map((m) => <MessageBubble key={m.id} message={m} />)}
      {streaming && (
        <div className="flex gap-3">
          <div className="flex size-7 items-center justify-center rounded-full bg-accent/15"><Bot className="size-3.5" /></div>
          <div className="max-w-[36rem] rounded-lg border border-border/60 bg-surface/50 px-3 py-2 text-sm">
            <p className="whitespace-pre-wrap leading-snug">{streaming}<span className="ml-0.5 inline-block size-2 animate-pulse rounded-full bg-foreground/40 align-middle" /></p>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Composer**

```tsx
// app/(app)/copilot/_components/composer.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState('')
  function submit() {
    if (text.trim().length === 0) return
    onSend(text)
    setText('')
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); submit() }} className="flex items-end gap-2 border-t border-border bg-background p-3">
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        placeholder="Ask anything — Copilot will reach for templates and cite attestations."
        className="flex-1 resize-none rounded-md border border-border bg-surface/40 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <Button type="submit" disabled={text.trim().length === 0}><Send className="size-3.5" /> Send</Button>
    </form>
  )
}
```

- [ ] **Step 6: Thread list**

```tsx
// app/(app)/copilot/_components/thread-list.tsx
import Link from 'next/link'
import { fmtRelativeTime } from '@/lib/format'
import type { CopilotThread } from '@/lib/api/types'

export function ThreadList({ threads, currentId }: { threads: CopilotThread[]; currentId?: string }) {
  return (
    <nav className="grid gap-0.5 p-2">
      {threads.map((t) => (
        <Link
          key={t.id}
          href={`/copilot/${t.id}`}
          aria-current={t.id === currentId ? 'page' : undefined}
          className={`grid gap-0.5 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 aria-[current=page]:bg-muted`}
        >
          <span className="truncate font-medium">{t.title}</span>
          <span className="font-tag text-[0.65rem] text-muted-foreground">{fmtRelativeTime(t.updatedAt)}</span>
        </Link>
      ))}
    </nav>
  )
}
```

- [ ] **Step 7: Page (root) — redirect to first thread or render landing**

```tsx
// app/(app)/copilot/page.tsx
import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { listCopilotThreads, createCopilotThread } from '@/lib/api/endpoints/copilot'

export default async function CopilotRoot() {
  const session = await requireUser()
  const threads = await listCopilotThreads({ user: session })
  if (threads.length > 0) redirect(`/copilot/${threads[0].id}`)
  const t = await createCopilotThread({ user: session }, { title: 'Untitled' })
  redirect(`/copilot/${t.id}`)
}
```

- [ ] **Step 8: Page (thread)**

```tsx
// app/(app)/copilot/[threadId]/page.tsx
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
    setThread((t) => ({ ...t, messages: [...t.messages, { id: 'm_local_' + Date.now(), role: 'user', text, createdAt: new Date().toISOString(), evidenceRunIds: [], toolCalls: [] }] }))
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
          <MessageStream threadId={thread.id} initial={thread.messages} pending={pending} onPersisted={onPersisted} />
        </div>
        <Composer onSend={send} />
      </section>
    </div>
  )
}
```

```tsx
// app/(app)/copilot/[threadId]/page.tsx (server wrapper — note: rename the client file above to copilot-shell.tsx, then this page imports it)
```

> **Refinement:** the previous step puts the client component inline in `page.tsx`. To compile, split into:
> - `app/(app)/copilot/[threadId]/copilot-shell.tsx` ← client component (`'use client'`)
> - `app/(app)/copilot/[threadId]/page.tsx` ← server component that fetches and passes props

Server wrapper:

```tsx
// app/(app)/copilot/[threadId]/page.tsx
import { requireUser } from '@/lib/auth/server'
import { getCopilotThread, listCopilotThreads } from '@/lib/api/endpoints/copilot'
import { CopilotShell } from './copilot-shell'

export default async function ThreadPage({ params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params
  const session = await requireUser()
  const ctx = { user: session }
  const [thread, threads] = await Promise.all([getCopilotThread(ctx, threadId), listCopilotThreads(ctx)])
  return <CopilotShell initialThread={thread} threads={threads} />
}
```

(Move the `CopilotShell` client component into `copilot-shell.tsx` with `'use client'` at the top.)

- [ ] **Step 9: Commit**

```bash
git add app/\(app\)/copilot components/features/copilot
git commit -m "feat(copilot): conversational workspace with streaming responses + evidence citation"
```

---

## Task 5: Build the Notebooks list and detail

**Files:**
- Create: `app/(app)/notebooks/page.tsx`
- Create: `app/(app)/notebooks/new/page.tsx`
- Create: `app/(app)/notebooks/[notebookId]/page.tsx`
- Create: `app/(app)/notebooks/[notebookId]/actions.ts`
- Create: `components/features/notebooks/cell-markdown.tsx`
- Create: `components/features/notebooks/cell-query.tsx`
- Create: `components/features/notebooks/cell-visualization.tsx`
- Create: `components/features/notebooks/cell-attestation.tsx`

- [ ] **Step 1: Cell renderers**

```tsx
// components/features/notebooks/cell-markdown.tsx
import { marked } from 'marked'

export function CellMarkdown({ markdown }: { markdown: string }) {
  const html = marked.parse(markdown, { async: false }) as string
  return <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
}
```

```tsx
// components/features/notebooks/cell-query.tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fixtures } from '@/lib/api/fixtures'

export function CellQuery({ dsl, runId }: { dsl: string; runId?: string }) {
  const run = runId ? fixtures.runs.find((r) => r.id === runId) : null
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Query</CardTitle></CardHeader>
      <CardContent className="grid gap-2">
        <pre className="overflow-auto rounded-md border border-border/60 bg-background p-2 font-mono text-xs">{dsl}</pre>
        {run && (
          <p className="text-xs text-muted-foreground">
            Result from <Link href={`/runs/${run.id}`} className="hover:underline font-mono">{run.id}</Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
```

```tsx
// components/features/notebooks/cell-visualization.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { fixtures } from '@/lib/api/fixtures'

export function CellVisualization({ runId, shape }: { runId: string; shape: 'bar' | 'line' | 'distribution' }) {
  const run = fixtures.runs.find((r) => r.id === runId)
  if (!run?.result) return null
  if (run.result.shape === 'time-series' && shape === 'line') {
    const data = run.result.series[0].points.map((p) => ({ t: p.t.slice(11, 16), v: p.v }))
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">{run.result.metric}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="t" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Line type="monotone" dataKey="v" stroke="oklch(0.78 0.07 256)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }
  if (run.result.shape === 'tabular' && shape === 'bar') {
    const data = run.result.rows.map((row) => ({ name: String(row[0]), value: Number(row[1]) }))
    return (
      <Card>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Bar dataKey="value" fill="oklch(0.78 0.07 256)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }
  return <p className="text-xs text-muted-foreground">No visualization available for this run shape.</p>
}
```

```tsx
// components/features/notebooks/cell-attestation.tsx
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fixtures } from '@/lib/api/fixtures'

export function CellAttestation({ runIds }: { runIds: string[] }) {
  const runs = runIds.map((id) => fixtures.runs.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => !!r)
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Cryptographic appendix</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        {runs.map((r) => (
          <div key={r.id} className="grid gap-1 rounded-md border border-border/60 bg-surface/30 p-3 text-xs">
            <p className="font-tag text-foreground/55">// {r.id}</p>
            {r.attestation && <CopyableHash value={r.attestation.outputSignature} short={false} />}
            {r.attestation?.anchorTxHash && <CopyableHash value={r.attestation.anchorTxHash} short={false} />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: List page**

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/server'
import { listNotebooks } from '@/lib/api/endpoints/notebooks'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { fmtRelativeTime } from '@/lib/format'
import { Plus } from 'lucide-react'

export default async function NotebooksPage() {
  const session = await requireUser()
  const notebooks = await listNotebooks({ user: session })
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// notebooks" title="Notebooks" description="Reproducible IC-ready memos with attested data, charts, and signed appendix." actions={<Button asChild><Link href="/notebooks/new"><Plus className="size-3.5" /> New notebook</Link></Button>} />
      <div className="mt-6 grid gap-3">
        {notebooks.map((n) => {
          const author = fixtures.users.find((u) => u.id === n.authorId)
          return (
            <Link key={n.id} href={`/notebooks/${n.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-surface/40 px-4 py-3 hover:bg-surface">
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.cells.length} cells · {n.description}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{author?.name}</p>
                <p>{fmtRelativeTime(n.updatedAt)}</p>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: New notebook**

```tsx
'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { createNotebook } from '@/lib/api/endpoints/notebooks'

export async function createNotebookAction(form: FormData) {
  const session = await requireUser()
  const n = await createNotebook({ user: session }, { title: String(form.get('title')) })
  redirect(`/notebooks/${n.id}`)
}
```

```tsx
// app/(app)/notebooks/new/page.tsx
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/common/page-header'
import { createNotebookAction } from '@/app/(app)/notebooks/[notebookId]/actions'

export default function NewNotebook() {
  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <PageHeader eyebrow="// new" title="New notebook" />
      <form action={createNotebookAction} className="mt-6 grid gap-3">
        <div className="grid gap-1.5"><Label htmlFor="t">Title</Label><Input id="t" name="title" required /></div>
        <Button type="submit">Create</Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 4: Detail page**

```tsx
import { requireUser } from '@/lib/auth/server'
import { getNotebook } from '@/lib/api/endpoints/notebooks'
import { PageHeader } from '@/components/common/page-header'
import { CellMarkdown } from '@/components/features/notebooks/cell-markdown'
import { CellQuery } from '@/components/features/notebooks/cell-query'
import { CellVisualization } from '@/components/features/notebooks/cell-visualization'
import { CellAttestation } from '@/components/features/notebooks/cell-attestation'

export default async function NotebookDetail({ params }: { params: Promise<{ notebookId: string }> }) {
  const { notebookId } = await params
  const session = await requireUser()
  const n = await getNotebook({ user: session }, notebookId)
  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <PageHeader eyebrow="// notebook" title={n.title} description={n.description} />
      <div className="mt-6 grid gap-6">
        {n.cells.map((c) => {
          if (c.kind === 'markdown') return <CellMarkdown key={c.id} markdown={c.markdown} />
          if (c.kind === 'query') return <CellQuery key={c.id} dsl={c.dsl} runId={c.runId} />
          if (c.kind === 'visualization') return <CellVisualization key={c.id} runId={c.runId} shape={c.shape === 'distribution' ? 'bar' : c.shape} />
          if (c.kind === 'attestation') return <CellAttestation key={c.id} runIds={c.runIds} />
          return null
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Stub actions file**

```ts
// app/(app)/notebooks/[notebookId]/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth/server'
import { createNotebook } from '@/lib/api/endpoints/notebooks'

export async function createNotebookAction(form: FormData) {
  const session = await requireUser()
  const n = await createNotebook({ user: session }, { title: String(form.get('title')) })
  redirect(`/notebooks/${n.id}`)
}
```

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/notebooks components/features/notebooks
git commit -m "feat(notebooks): list + detail with markdown/query/visualization/attestation cells"
```

---

## Task 6: Replace lineage with full reactflow graph

**Files:**
- Create: `components/features/datasets/full-lineage-graph.tsx`
- Modify: `app/(app)/datasets/[datasetId]/lineage/page.tsx`

- [ ] **Step 1: Write `full-lineage-graph.tsx`**

```tsx
'use client'

import 'reactflow/dist/style.css'
import ReactFlow, { Background, Controls, MarkerType, type Edge as RfEdge, type Node as RfNode } from 'reactflow'
import { useMemo } from 'react'
import type { Lineage } from '@/lib/api/endpoints/datasets'

const KIND_COLOR: Record<string, string> = {
  source: 'oklch(0.65 0.05 256)',
  agent: 'oklch(0.78 0.07 256)',
  storage: 'oklch(0.50 0.04 256)',
  enclave: 'oklch(0.62 0.13 145)',
  output: 'oklch(0.78 0.14 80)',
}

export function FullLineageGraph({ lineage }: { lineage: Lineage }) {
  const nodes: RfNode[] = useMemo(() =>
    lineage.nodes.map((n, i) => ({
      id: n.id,
      position: { x: i * 220, y: 0 },
      data: { label: <div><div className="font-tag text-[0.65rem] text-muted-foreground">{n.kind}</div><div className="text-sm font-medium">{n.label}</div></div> },
      style: { background: 'var(--surface)', border: `1.5px solid ${KIND_COLOR[n.kind] ?? 'var(--border)'}`, padding: 12, borderRadius: 8, minWidth: 160 },
    })), [lineage])

  const edges: RfEdge[] = useMemo(() =>
    lineage.edges.map((e, i) => ({
      id: `e_${i}`,
      source: e.from,
      target: e.to,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { stroke: 'var(--border)' },
    })), [lineage])

  return (
    <div className="h-[28rem] rounded-lg border border-border bg-surface/40">
      <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
        <Background gap={24} />
        <Controls position="bottom-right" />
      </ReactFlow>
    </div>
  )
}
```

- [ ] **Step 2: Replace placeholder in lineage page**

Edit `app/(app)/datasets/[datasetId]/lineage/page.tsx` — replace `<LineageFlow lineage={lineage} />` with `<FullLineageGraph lineage={lineage} />`. Add the import.

- [ ] **Step 3: Add completeness graph**

```tsx
// components/features/datasets/completeness-graph.tsx
'use client'

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, ReferenceArea } from 'recharts'

export function CompletenessGraph() {
  const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, completeness: i === 14 ? 0.87 : 0.97 + Math.random() * 0.02 }))
  return (
    <div className="h-48 rounded-lg border border-border bg-surface/40 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="hour" stroke="currentColor" fontSize={11} />
          <YAxis stroke="currentColor" fontSize={11} domain={[0.8, 1.0]} />
          <ReferenceArea x1={13.5} x2={14.5} fill="oklch(0.62 0.21 25)" fillOpacity={0.15} />
          <Line type="monotone" dataKey="completeness" stroke="oklch(0.78 0.07 256)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

Add `<CompletenessGraph />` to the lineage page below the flow.

- [ ] **Step 4: Commit**

```bash
git add components/features/datasets/full-lineage-graph.tsx components/features/datasets/completeness-graph.tsx app/\(app\)/datasets/\[datasetId\]/lineage/page.tsx
git commit -m "feat(datasets): full reactflow lineage + completeness graph with gap markers"
```

---

## Task 7: Schema version diff viewer

**Files:**
- Create: `components/features/schemas/schema-version-diff.tsx`
- Create: `app/(app)/schemas/[schemaId]/versions/page.tsx`

- [ ] **Step 1: Diff component**

```tsx
import { fixtures } from '@/lib/api/fixtures'
import type { Schema, SchemaField } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'

type Diff = { added: SchemaField[]; removed: SchemaField[]; changed: { field: string; before: SchemaField; after: SchemaField }[] }

function diff(prev: Schema, next: Schema): Diff {
  const prevByName = new Map(prev.fields.map((f) => [f.name, f]))
  const nextByName = new Map(next.fields.map((f) => [f.name, f]))
  const added: SchemaField[] = []
  const removed: SchemaField[] = []
  const changed: Diff['changed'] = []
  for (const f of next.fields) {
    const before = prevByName.get(f.name)
    if (!before) added.push(f)
    else if (JSON.stringify(before) !== JSON.stringify(f)) changed.push({ field: f.name, before, after: f })
  }
  for (const f of prev.fields) {
    if (!nextByName.has(f.name)) removed.push(f)
  }
  return { added, removed, changed }
}

export function SchemaVersionDiff({ prev, next }: { prev: Schema; next: Schema }) {
  const d = diff(prev, next)
  return (
    <div className="grid gap-4">
      <Section title="Added" tone="success">
        {d.added.map((f) => <Row key={f.name} field={f} />)}
        {d.added.length === 0 && <Empty>No fields added.</Empty>}
      </Section>
      <Section title="Removed" tone="destructive">
        {d.removed.map((f) => <Row key={f.name} field={f} />)}
        {d.removed.length === 0 && <Empty>No fields removed.</Empty>}
      </Section>
      <Section title="Changed" tone="info">
        {d.changed.map((c) => (
          <div key={c.field} className="grid grid-cols-2 gap-3 rounded-md border border-border/60 bg-surface/30 p-2">
            <div><p className="font-tag text-foreground/55 text-[0.65rem]">// before</p><Row field={c.before} /></div>
            <div><p className="font-tag text-foreground/55 text-[0.65rem]">// after</p><Row field={c.after} /></div>
          </div>
        ))}
        {d.changed.length === 0 && <Empty>No fields changed.</Empty>}
      </Section>
    </div>
  )
}

function Section({ title, tone, children }: { title: string; tone: 'success' | 'destructive' | 'info'; children: React.ReactNode }) {
  const TONE = { success: 'border-success/30 bg-success/5', destructive: 'border-destructive/30 bg-destructive/5', info: 'border-info/30 bg-info/5' } as const
  return (
    <section className={`rounded-lg border ${TONE[tone]} p-4`}>
      <h3 className="font-tag mb-2 text-foreground/60">// {title}</h3>
      <div className="grid gap-1.5">{children}</div>
    </section>
  )
}

function Row({ field }: { field: SchemaField }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-mono text-xs">{field.name}</span>
      <Badge variant="outline" className="font-tag text-[0.65rem]">{field.type}</Badge>
      <Badge variant="outline" className="font-tag text-[0.65rem]">{field.exposure}</Badge>
      {field.minBucketSize != null && <span className="text-xs text-muted-foreground">min bucket {field.minBucketSize}</span>}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground">{children}</p>
}
```

- [ ] **Step 2: Versions page**

```tsx
import { requireUser } from '@/lib/auth/server'
import { listSchemaVersions } from '@/lib/api/endpoints/schemas-endpoint'
import { fixtures } from '@/lib/api/fixtures'
import { PageHeader } from '@/components/common/page-header'
import { SchemaVersionDiff } from '@/components/features/schemas/schema-version-diff'

export default async function SchemaVersions({ params }: { params: Promise<{ schemaId: string }> }) {
  const { schemaId } = await params
  const session = await requireUser()
  const current = fixtures.schemas.find((s) => s.id === schemaId)
  if (!current) throw new Error('Schema not found')
  const versions = await listSchemaVersions({ user: session }, current.datasetId)
  if (versions.length < 2) {
    return (
      <div className="px-6 py-6 max-w-[1400px] mx-auto">
        <PageHeader eyebrow="// versions" title="Schema versions" description="Only one version on file." />
      </div>
    )
  }
  const next = versions[0]
  const prev = versions[1]
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <PageHeader eyebrow="// versions" title={`v${prev.version} → v${next.version}`} description={next.changeSummary} />
      <div className="mt-6"><SchemaVersionDiff prev={prev} next={next} /></div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/features/schemas/schema-version-diff.tsx app/\(app\)/schemas/\[schemaId\]/versions
git commit -m "feat(schemas): version diff viewer with added/removed/changed sections"
```

---

## Task 8: E2E — copilot + notebooks

**Files:**
- Create: `tests/e2e/copilot.spec.ts`
- Create: `tests/e2e/notebooks.spec.ts`

```ts
// tests/e2e/copilot.spec.ts
import { test, expect } from '@playwright/test'

test('copilot: send a message and see streaming reply', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.getByRole('link', { name: /copilot/i }).first().click()
  await page.getByPlaceholder(/ask anything/i).fill('Is mF-ONE in concentration breach?')
  await page.getByRole('button', { name: /send/i }).click()
  await expect(page.locator('text=Industrials').first()).toBeVisible({ timeout: 8000 })
})
```

```ts
// tests/e2e/notebooks.spec.ts
import { test, expect } from '@playwright/test'

test('notebooks: open existing memo and see attested cells', async ({ page }) => {
  await page.goto('/login')
  await page.getByRole('button', { name: /demo counterparty/i }).click()
  await page.goto('/notebooks/nb_q2_credit_memo')
  await expect(page.getByRole('heading', { name: /q2 2026 mF-ONE credit memo/i })).toBeVisible()
  await expect(page.getByText(/cryptographic appendix/i)).toBeVisible()
})
```

```bash
npm run test:e2e -- copilot notebooks
git add tests/e2e/copilot.spec.ts tests/e2e/notebooks.spec.ts
git commit -m "test(e2e): copilot streaming + notebooks render"
```

---

## Task 9: Final ADR + quality gate sweep

**Files:**
- Create: `docs/architecture/0002-v2-features.md`

- [ ] **Step 1: ADR**

```markdown
# ADR 0002 — V2 features

**Date:** 2026-05-08
**Status:** Accepted

## Context

Plans 01–05 shipped the MVP. Plan 06 adds Copilot, Notebooks, Lineage,
and a status banner — the V2 surfaces from the spec §7.2.

## Decision

- **Copilot streams over Server Actions returning AsyncIterables.** No SSE
  endpoint needed — Next 16 + React 19 stream iterables across the wire.
- **Notebook cells are server-rendered** for SEO/share-link viability;
  edit-mode introduces a client shell when needed (deferred polish).
- **Lineage uses reactflow** for pan/zoom; it's the smallest dep that
  gives us decent flow rendering without bespoke SVG work.
- **Status banner mounts above the topbar** and reads from a public stub
  endpoint that maps to status.hyve.xyz when wired to a real backend.

## Consequences

- Copilot replies feel real-time despite the mock contract.
- Notebooks share-link viability is preserved — can render without auth
  in a future read-only public path.
- Lineage adds ~80kB gzipped (reactflow). Acceptable for an originator
  diagnostic surface that loads on demand.
```

- [ ] **Step 2: Final sweep**

```bash
npm run typecheck && npm run lint && npm run test && npm run build
npm run test:e2e
git add docs/architecture/0002-v2-features.md
git commit -m "docs(adr): 0002 V2 features (copilot, notebooks, lineage, status)"
```

---

## Self-review

- [ ] All four quality gates pass.
- [ ] `/copilot` streams a reply token-by-token, with evidence citations.
- [ ] `/notebooks` lists notebooks; opening the demo memo shows markdown + query + viz + attestation cells.
- [ ] Dataset lineage tab now uses the full reactflow graph; completeness graph shows the gap marker.
- [ ] Schema versions diff viewer renders added/removed/changed sections.
- [ ] When the status fixture is non-operational, the banner appears above the topbar.
- [ ] No raw `fetch()` outside `lib/api/`.
- [ ] Copilot + Notebooks E2E specs pass.

---

## Out of scope

- Real-time co-editing of notebooks — needs CRDT plumbing
- Notebook export to PDF with cryptographic appendix — needs a PDF renderer
- Public read-only notebook share links — needs unauthenticated route + share-token verification
- Anchor explorer integration on the lineage graph — links go to placeholder for now
