# v2 Overview Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/v2` so it reads as an operator's mission control — DAG dominant on a naked-on-grid canvas, with a glass rail in three states (attention queue / node detail / output-node detail with live NAV + consumer deliveries).

**Architecture:** Three rail body components composed by a state-machine shell that cross-fades between them. DAG nodes rewritten as chip-tablets with no fill; the two publish-column nodes carry value-bearing footers (NAV per share, total NAV + countdown). Pipeline-derived attention items are computed at render time; static counterparty/rule items live on the fixture. Live NAV is never a permanent hero in the rail; it appears only when the output node is selected (State C).

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4 + scoped `--v2-*` tokens, shadcn/ui patterns, Framer Motion (already a dep), React Flow (already a dep), Vitest, Playwright MCP.

**Reference spec:** `docs/superpowers/specs/2026-05-14-v2-overview-redesign-design.md`

---

## File map

**Create:**
- `components/v2/features/overview/attention.ts` — derive + rank + cap attention items
- `components/v2/features/overview/attention.test.ts` — Vitest unit tests for `computeAttention`
- `components/v2/features/overview/rail.tsx` — three-state rail shell with cross-fade
- `components/v2/features/overview/rail-attention-queue.tsx` — State A body
- `components/v2/features/overview/rail-node-detail.tsx` — State B body
- `components/v2/features/overview/rail-output-detail.tsx` — State C body

**Modify:**
- `components/v2/features/overview/pipeline-types.ts` — add `ConsumerDelivery`, `AttentionItem`; widen `PipelineNodeData` + `PipelineFixture`
- `components/v2/features/overview/pipeline-fixture.ts` — add `consumerDeliveries` to `pub-attest`, add `attention[]`
- `components/v2/features/overview/pipeline-node.tsx` — rewrite as chip-tablet, value-bearing footer for publish-column nodes
- `components/v2/features/overview/pipeline-graph.tsx` — drop React Flow's `<Background>`, animate edges incident to selected node
- `components/v2/features/overview/card-aura.tsx` — lower default light/dark alpha caps
- `components/v2/features/overview/overview.tsx` — full rewrite (header, DAG, rail composition, drop KpiStrip + standalone panel)
- `components/v2/features/overview/index.ts` — exports update
- `app/v2/v2.css` — keyframes for the edge-trail dash animation

**Delete:**
- `components/v2/features/overview/node-detail-panel.tsx`
- `components/v2/features/overview/kpi-strip.tsx`

---

## Task 1: Types and fixture data

**Files:**
- Modify: `components/v2/features/overview/pipeline-types.ts`
- Modify: `components/v2/features/overview/pipeline-fixture.ts`

- [ ] **Step 1: Add `ConsumerDelivery` and `AttentionItem` to types**

Edit `components/v2/features/overview/pipeline-types.ts`. Add the new types and widen `PipelineNodeData` and `PipelineFixture`:

```ts
/** Consumer chain that subscribes to the attested NAV publish payload. */
export interface ConsumerDelivery {
  /** Display name, e.g. "Morpho". */
  name: string
  /** Network slug, e.g. "mainnet" or "oracle". */
  network: string
  /** ISO timestamp of last delivery. */
  lastDeliveryAt: string
  /** Truncated tx or content hash, e.g. "0xa412…b8de". */
  payloadRef: string
}

/** Heterogeneous items the operator should see that aren't visible in the DAG. */
export type AttentionItem =
  | {
      kind: 'counterparty_request'
      label: string
      detail: string
      at: string  // ISO
      href: string
    }
  | {
      kind: 'rule_fire'
      label: string
      detail: string
      at: string  // ISO
      href: string
    }
```

In the existing `PipelineNodeData` interface, add (optional):

```ts
  /** Only set on the output node (`pub-attest`). */
  consumerDeliveries?: ConsumerDelivery[]
```

In the existing `PipelineFixture` interface, add:

```ts
  attention: AttentionItem[]
```

- [ ] **Step 2: Add `consumerDeliveries` to `pub-attest` and `attention[]` to the fixture**

Edit `components/v2/features/overview/pipeline-fixture.ts`. Find the `pub-attest` node entry and add `consumerDeliveries` to its `data` object:

```ts
{
  id: 'pub-attest',
  data: {
    label: 'Attested publish',
    phase: 'publish',
    status: 'pending',
    cadence: 'every 15m',
    lastRunAt: minutesAgo(18),
    nextRunAt: minutesAhead(37),
    description:
      'Final attestation, signed bundle anchored on-chain. Held pending reconciliation breaks resolution.',
    inputs: [
      { label: 'nav/sh', value: '$103.4719' },
      { label: 'breaks', value: '2 open' },
    ],
    output: { label: 'tx', value: '— (held)' },
    provenance: {
      signingKey: 'kid:verant.0xc9e2',
      proofType: 'merkle-anchor',
      reference: 'awaiting attestation',
    },
    consumerDeliveries: [
      { name: 'Morpho',   network: 'mainnet', lastDeliveryAt: minutesAgo(3), payloadRef: '0xa412…b8de' },
      { name: 'Gauntlet', network: 'mainnet', lastDeliveryAt: minutesAgo(3), payloadRef: '0xb73c…f201' },
      { name: 'RedStone', network: 'oracle',  lastDeliveryAt: minutesAgo(3), payloadRef: '0x8e1a…2c97' },
    ],
  },
},
```

At the end of the `overviewPipeline` object (after `edges: [...]`), add the `attention` array (note this is a sibling of `nodes` and `edges`, not nested):

```ts
attention: [
  {
    kind: 'counterparty_request',
    label: 'Aave V4 requesting NAV access',
    detail: 'mainnet · 25k TVL committed',
    at: minutesAgo(67),
    href: '/v2/counterparties',
  },
  {
    kind: 'rule_fire',
    label: 'NAV move > 0.5% intraday',
    detail: '+0.62% from prior publish',
    at: minutesAgo(28),
    href: '/v2/alerts',
  },
],
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/overview/pipeline-types.ts \
        components/v2/features/overview/pipeline-fixture.ts
git commit -m "feat(v2-overview): add consumer-delivery and attention types + fixture data"
```

---

## Task 2: Attention derivation utility (TDD)

**Files:**
- Create: `components/v2/features/overview/attention.test.ts`
- Create: `components/v2/features/overview/attention.ts`

Pure function. Strict TDD applies.

- [ ] **Step 1: Write the failing tests**

Create `components/v2/features/overview/attention.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeAttention } from './attention'
import type { AttentionItem, PipelineFixture, PipelineNode } from './pipeline-types'

const NOW = Date.parse('2026-05-14T14:23:00Z')
const minutesAgo = (m: number) => new Date(NOW - m * 60_000).toISOString()

function node(
  id: string,
  status: PipelineNode['data']['status'],
  overrides: Partial<PipelineNode['data']> = {}
): PipelineNode {
  return {
    id,
    data: {
      label: id,
      phase: 'value',
      status,
      cadence: 'every 15m',
      lastRunAt: minutesAgo(5),
      nextRunAt: minutesAgo(-5),
      description: '',
      inputs: [],
      output: { label: 'out', value: '—' },
      provenance: { signingKey: '', proofType: 'kzg', reference: '' },
      ...overrides,
    },
  }
}

function fixture(
  over: Partial<PipelineFixture> = {}
): PipelineFixture {
  return {
    kpi: {
      totalNav: '',
      navPerShare: '',
      sharesOutstanding: '',
      nextPublishAt: minutesAgo(-10),
      asOfLabel: '',
    },
    nodes: [],
    edges: [],
    attention: [],
    ...over,
  }
}

describe('computeAttention', () => {
  it('returns no items when pipeline is clean and attention[] is empty', () => {
    const out = computeAttention(fixture({
      nodes: [node('a', 'attested')],
    }))
    expect(out.items).toEqual([])
    expect(out.overflow).toBe(0)
  })

  it('ranks failed pipeline items above pending and above static items', () => {
    const fix = fixture({
      nodes: [
        node('val-x', 'failed'),
        node('val-y', 'pending'),
        node('pub-attest', 'attested'),
      ],
      edges: [
        { id: 'e1', source: 'val-x', target: 'val-y' },
        { id: 'e2', source: 'val-y', target: 'pub-attest' },
      ],
      attention: [
        {
          kind: 'counterparty_request',
          label: 'CR',
          detail: '',
          at: minutesAgo(10),
          href: '#',
        },
      ],
    })
    const out = computeAttention(fix)
    expect(out.items[0].kind).toBe('pipeline_failed')
    expect(out.items[1].kind).toBe('pipeline_pending')
    expect(out.items[2].kind).toBe('counterparty_request')
  })

  it('treats pub-attest with status=pending as a held attestation, not a generic pending', () => {
    const fix = fixture({
      nodes: [
        node('pub-attest', 'pending'),
      ],
    })
    const out = computeAttention(fix)
    expect(out.items).toHaveLength(1)
    expect(out.items[0].kind).toBe('pipeline_held')
  })

  it('excludes pending nodes that are NOT on the path to pub-attest', () => {
    const fix = fixture({
      nodes: [
        node('off-path',  'pending'),
        node('on-path',   'pending'),
        node('pub-attest','attested'),
      ],
      edges: [
        // off-path -> nowhere; on-path -> pub-attest
        { id: 'e1', source: 'on-path', target: 'pub-attest' },
      ],
    })
    const out = computeAttention(fix)
    const labels = out.items.map((i) => 'nodeId' in i && i.nodeId).filter(Boolean)
    expect(labels).toEqual(['on-path'])
  })

  it('sorts counterparty_request and rule_fire newest first within their kind', () => {
    const fix = fixture({
      attention: [
        { kind: 'rule_fire', label: 'older rule', detail: '', at: minutesAgo(120), href: '#' },
        { kind: 'rule_fire', label: 'newer rule', detail: '', at: minutesAgo(5),   href: '#' },
        { kind: 'counterparty_request', label: 'older cr', detail: '', at: minutesAgo(100), href: '#' },
        { kind: 'counterparty_request', label: 'newer cr', detail: '', at: minutesAgo(2),   href: '#' },
      ],
    })
    const out = computeAttention(fix)
    expect(out.items.map((i) => i.label)).toEqual([
      'newer cr',
      'older cr',
      'newer rule',
      'older rule',
    ])
  })

  it('caps at 5 and exposes overflow count', () => {
    const fix = fixture({
      attention: [
        { kind: 'rule_fire', label: 'r1', detail: '', at: minutesAgo(1), href: '#' },
        { kind: 'rule_fire', label: 'r2', detail: '', at: minutesAgo(2), href: '#' },
        { kind: 'rule_fire', label: 'r3', detail: '', at: minutesAgo(3), href: '#' },
        { kind: 'rule_fire', label: 'r4', detail: '', at: minutesAgo(4), href: '#' },
        { kind: 'rule_fire', label: 'r5', detail: '', at: minutesAgo(5), href: '#' },
        { kind: 'rule_fire', label: 'r6', detail: '', at: minutesAgo(6), href: '#' },
        { kind: 'rule_fire', label: 'r7', detail: '', at: minutesAgo(7), href: '#' },
      ],
    })
    const out = computeAttention(fix)
    expect(out.items).toHaveLength(5)
    expect(out.overflow).toBe(2)
  })
})
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `pnpm test attention`
Expected: all tests fail with "computeAttention is not defined" (or similar — module not found).

- [ ] **Step 3: Write the minimal implementation**

Create `components/v2/features/overview/attention.ts`:

```ts
import type { AttentionItem, PipelineFixture } from './pipeline-types'

/** Pipeline-derived attention rows carry their originating node id so the rail can focus the DAG. */
export type ComputedAttentionItem =
  | {
      kind: 'pipeline_failed' | 'pipeline_pending' | 'pipeline_held'
      label: string
      detail: string
      at: string
      href: string
      nodeId: string
    }
  | AttentionItem

export interface ComputeAttentionResult {
  items: ComputedAttentionItem[]
  overflow: number
}

const OUTPUT_NODE_ID = 'pub-attest'
const CAP = 5

const KIND_RANK: Record<ComputedAttentionItem['kind'], number> = {
  pipeline_failed: 0,
  pipeline_pending: 1,
  pipeline_held: 2,
  counterparty_request: 3,
  rule_fire: 4,
}

/** Returns the set of node ids that reach OUTPUT_NODE_ID via the pipeline edges. */
function nodesBlockingOutput(fixture: PipelineFixture): Set<string> {
  const incoming = new Map<string, string[]>()
  for (const e of fixture.edges) {
    const arr = incoming.get(e.target) ?? []
    arr.push(e.source)
    incoming.set(e.target, arr)
  }
  const blocking = new Set<string>()
  const queue: string[] = [OUTPUT_NODE_ID]
  while (queue.length) {
    const cur = queue.shift() as string
    for (const src of incoming.get(cur) ?? []) {
      if (!blocking.has(src)) {
        blocking.add(src)
        queue.push(src)
      }
    }
  }
  return blocking
}

export function computeAttention(fixture: PipelineFixture): ComputeAttentionResult {
  const blocking = nodesBlockingOutput(fixture)
  const items: ComputedAttentionItem[] = []

  for (const n of fixture.nodes) {
    if (n.data.status === 'failed') {
      items.push({
        kind: 'pipeline_failed',
        label: n.data.label,
        detail: 'failed',
        at: n.data.lastRunAt,
        href: '/v2',
        nodeId: n.id,
      })
    } else if (n.id === OUTPUT_NODE_ID && n.data.status === 'pending') {
      items.push({
        kind: 'pipeline_held',
        label: n.data.label,
        detail: 'held by upstream',
        at: n.data.lastRunAt,
        href: '/v2',
        nodeId: n.id,
      })
    } else if (n.data.status === 'pending' && blocking.has(n.id)) {
      items.push({
        kind: 'pipeline_pending',
        label: n.data.label,
        detail: n.data.output.value,
        at: n.data.lastRunAt,
        href: '/v2',
        nodeId: n.id,
      })
    }
  }

  for (const item of fixture.attention) {
    items.push(item)
  }

  items.sort((a, b) => {
    const r = KIND_RANK[a.kind] - KIND_RANK[b.kind]
    if (r !== 0) return r
    if (a.kind === 'counterparty_request' || a.kind === 'rule_fire') {
      return new Date(b.at).getTime() - new Date(a.at).getTime()
    }
    return 0
  })

  const total = items.length
  return {
    items: items.slice(0, CAP),
    overflow: Math.max(0, total - CAP),
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `pnpm test attention`
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/overview/attention.ts \
        components/v2/features/overview/attention.test.ts
git commit -m "feat(v2-overview): computeAttention utility with rank, cap, overflow"
```

---

## Task 3: Lower card-aura intensities

**Files:**
- Modify: `components/v2/features/overview/card-aura.tsx`

The user flagged auras as a "slop tell." Existing alphas exceed the §9 caps from the spec (light ≤ 0.18, dark ≤ 0.30). Tighten the palette.

- [ ] **Step 1: Update the PALETTE in card-aura.tsx**

Replace the existing `PALETTE` constant in `components/v2/features/overview/card-aura.tsx`:

```ts
const PALETTE: Record<AuraVariant, {
  light: [string, string]
  dark:  [string, string]
}> = {
  warm: {
    light: ['rgba(220,170,140,0.16)', 'rgba(200,150,120,0.06)'],
    dark:  ['rgba(220,140, 90,0.28)', 'rgba(200,110, 60,0.12)'],
  },
  cool: {
    light: ['rgba(140,170,220,0.14)', 'rgba(110,150,200,0.05)'],
    dark:  ['rgba( 80,120,200,0.26)', 'rgba( 60,100,170,0.11)'],
  },
  neutral: {
    light: ['rgba(220,210,185,0.14)', 'rgba(200,190,165,0.05)'],
    dark:  ['rgba(190,170,120,0.24)', 'rgba(160,140, 90,0.10)'],
  },
  amber: {
    light: ['rgba(220,185, 80,0.14)', 'rgba(200,165, 60,0.05)'],
    dark:  ['rgba(200,145, 20,0.28)', 'rgba(170,120,  0,0.12)'],
  },
}
```

Also reduce the fractal-noise overlay opacities (a subtle visual lift that also reads as slop at high opacities). Find the `<svg>` line and replace:

```tsx
<svg
  className="absolute inset-0 h-full w-full opacity-[0.08] mix-blend-multiply dark:opacity-[0.12] dark:mix-blend-soft-light"
  aria-hidden
>
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/overview/card-aura.tsx
git commit -m "refactor(v2-overview): tighten card-aura intensities per spec §9"
```

---

## Task 4: Rewrite pipeline-node as chip-tablet with publish-column value footers

**Files:**
- Modify: `components/v2/features/overview/pipeline-node.tsx`

Replace the entire file. The new node is borderless-fill (transparent so the grid shows through), hairline border, single-line label, mono cadence + age footer. The publish-column nodes get value-bearing footers instead.

- [ ] **Step 1: Replace `pipeline-node.tsx`**

Overwrite `components/v2/features/overview/pipeline-node.tsx` with:

```tsx
'use client'

import { memo } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { cn } from '@/lib/utils'
import type { PipelineNodeData, PipelineStatus } from './pipeline-types'

const STATUS_DOT: Record<PipelineStatus, string> = {
  attested: 'bg-v2-success',
  pending: 'bg-v2-warning',
  failed: 'bg-v2-danger',
}

const STATUS_GLOW: Record<PipelineStatus, string> = {
  attested: 'shadow-[0_0_8px_rgba(64,160,90,0.45)]',
  pending: 'shadow-[0_0_8px_rgba(210,160,60,0.55)]',
  failed: 'shadow-[0_0_10px_rgba(220,80,60,0.55)]',
}

/** Relative-time formatter — "12m ago", "3h ago", "just now". */
function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  if (diffMs < 0) return 'in queue'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  return `${day}d ago`
}

/** Live countdown formatter for the pub-attest footer. */
function countdown(targetIso: string, now: number = Date.now()): string {
  const ms = Math.max(0, new Date(targetIso).getTime() - now)
  const total = Math.floor(ms / 1000)
  const mm = Math.floor(total / 60)
  const ss = total % 60
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

interface FooterProps {
  data: PipelineNodeData
  nodeId: string
}

/** Most nodes show cadence (left) + last-run-ago (right). */
function StandardFooter({ data }: FooterProps) {
  return (
    <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
      <span className="truncate font-mono text-v2-muted">{data.cadence}</span>
      <span
        className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
        title={new Date(data.lastRunAt).toISOString()}
        suppressHydrationWarning
      >
        {relativeTime(data.lastRunAt)}
      </span>
    </div>
  )
}

/** pub-pershare shows the per-share value (left) + last-run-ago (right). */
function PerShareFooter({ data }: FooterProps) {
  return (
    <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
      <span className="truncate font-mono tabular-nums text-v2-foreground">
        {data.output.value}
      </span>
      <span
        className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
        suppressHydrationWarning
      >
        {relativeTime(data.lastRunAt)}
      </span>
    </div>
  )
}

/** pub-attest shows the total NAV (left) + live countdown (right). */
function AttestFooter({ data }: FooterProps) {
  // Reads the total NAV from the `nav` input added in Task 4 Step 2.
  const totalNavInput = data.inputs.find((i) => i.label === 'nav')
  const displayValue = totalNavInput?.value ?? data.output.value
  return (
    <div className="mt-1.5 flex items-center justify-between text-[10px] leading-none">
      <span className="truncate font-mono tabular-nums text-v2-foreground">
        {displayValue}
      </span>
      <span
        className="shrink-0 pl-2 font-mono tabular-nums text-v2-muted/70"
        title={new Date(data.nextRunAt).toISOString()}
        suppressHydrationWarning
      >
        next {countdown(data.nextRunAt)}
      </span>
    </div>
  )
}

export const PipelineNodeCard = memo(function PipelineNodeCard({
  id,
  data,
  selected,
}: NodeProps<PipelineNodeData>) {
  const { status, phase, label } = data
  const showLeftHandle = phase !== 'source'
  const showRightHandle = phase !== 'publish'

  let Footer: (p: FooterProps) => JSX.Element = StandardFooter
  if (id === 'pub-pershare') Footer = PerShareFooter
  else if (id === 'pub-attest') Footer = AttestFooter

  return (
    <div
      className={cn(
        'group relative w-[155px] rounded-md border bg-transparent px-3 py-2 text-left',
        'transition-all duration-150',
        'hover:-translate-y-px',
        selected
          ? 'border-v2-foreground/70 ring-1 ring-v2-foreground/15 shadow-[0_0_24px_-8px_rgba(220,170,140,0.45)]'
          : status === 'failed'
            ? 'border-v2-danger/50 shadow-[0_0_24px_-10px_rgba(220,80,60,0.5)]'
            : 'border-v2-border/60 hover:border-v2-foreground/40'
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 shrink-0 rounded-full',
            STATUS_DOT[status],
            STATUS_GLOW[status]
          )}
          aria-hidden="true"
        />
        <p className="truncate text-[12.5px] font-medium leading-tight text-v2-foreground">
          {label}
        </p>
      </div>

      <Footer data={data} nodeId={id} />

      {showLeftHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-1.5 !w-1.5 !border-0 !bg-v2-border"
          isConnectable={false}
        />
      )}
      {showRightHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-1.5 !w-1.5 !border-0 !bg-v2-border"
          isConnectable={false}
        />
      )}
    </div>
  )
})
```

- [ ] **Step 2: Add an explicit headline NAV to the pub-attest fixture entry**

Edit `components/v2/features/overview/pipeline-fixture.ts`. In the `pub-attest` node's `inputs` array, change the labels so the lookup in `AttestFooter` works:

Find:
```ts
inputs: [
  { label: 'nav/sh', value: '$103.4719' },
  { label: 'breaks', value: '2 open' },
],
```

Replace with:
```ts
inputs: [
  { label: 'nav',    value: '$1,247,318,402' },
  { label: 'nav/sh', value: '$103.4719' },
  { label: 'breaks', value: '2 open' },
],
```

This makes the total-NAV value retrievable from `data.inputs.find(i => i.label === 'nav')` for the footer.

- [ ] **Step 3: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test attention`
Expected: both PASS.

- [ ] **Step 4: Visual verification — chip-tablet rendering**

Start the dev server in another terminal: `pnpm dev`
Navigate Playwright MCP to `http://localhost:3000/v2` and take a screenshot.

Verify:
- Nodes are narrower (~155px), shorter, no fill
- Status dot has a soft glow
- "Attested publish" footer shows `$1,247,318,402` and `next MM:SS`
- "NAV per share" footer shows `$103.4719`
- Other nodes still show cadence + age
- No "ATTESTED" / "PENDING" pill text on any node

If anything looks off, iterate per the project's visual-fix loop before committing.

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/overview/pipeline-node.tsx \
        components/v2/features/overview/pipeline-fixture.ts
git commit -m "feat(v2-overview): chip-tablet pipeline nodes with publish-column value footers"
```

---

## Task 5: Naked DAG canvas + edge-trail on selection

**Files:**
- Modify: `components/v2/features/overview/pipeline-graph.tsx`
- Modify: `app/v2/v2.css`

The DAG canvas must show the page grid background through it (no React Flow Background). Edges incident to the selected node get a marching-ants animation.

- [ ] **Step 1: Add the keyframes to `app/v2/v2.css`**

Append to `app/v2/v2.css`:

```css
/* ---------- Pipeline edge-trail animation ---------- */
@keyframes v2-edge-dash {
  to {
    stroke-dashoffset: -16;
  }
}

[data-v2] .v2-edge-animated path {
  stroke-dasharray: 4 4;
  animation: v2-edge-dash 1.2s linear infinite;
}

/* ---------- Countdown colon pulse (rail State A) ---------- */
@keyframes v2-colon-pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.35; }
}

@media (prefers-reduced-motion: reduce) {
  [data-v2] .v2-edge-animated path {
    animation: none;
  }
}
```

- [ ] **Step 2: Update `pipeline-graph.tsx`**

Open `components/v2/features/overview/pipeline-graph.tsx`. Make these changes:

(a) Remove the `Background` import — change

```ts
import ReactFlow, {
  Background,
  BackgroundVariant,
  MarkerType,
  ...
} from 'reactflow'
```

to

```ts
import ReactFlow, {
  MarkerType,
  ...
} from 'reactflow'
```

(b) In the JSX, delete the `<Background ... />` element entirely.

(c) Tag selected-incident edges with the animation class. Replace the `flowEdges` `useMemo` block with:

```tsx
const flowEdges: Edge[] = useMemo(
  () =>
    pipeline.edges.map((e) => {
      const incident =
        selectedId !== null && (e.source === selectedId || e.target === selectedId)
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        className: incident ? 'v2-edge-animated' : undefined,
        style: incident
          ? { stroke: 'var(--v2-foreground)', strokeWidth: 1.25, opacity: 0.85 }
          : undefined,
      }
    }),
  [pipeline.edges, selectedId]
)
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Visual verification — naked DAG + edge trail**

With the dev server running, navigate Playwright to `/v2`.

Verify:
- The DAG canvas no longer has its own dot pattern; the page grid is visible through it
- Click any node → its incoming and outgoing edges show the dashed marching-ants animation
- Click empty space → the animation stops

- [ ] **Step 5: Commit**

```bash
git add components/v2/features/overview/pipeline-graph.tsx app/v2/v2.css
git commit -m "feat(v2-overview): naked DAG canvas with edge-trail on selection"
```

---

## Task 6: Rail shell (state machine)

**Files:**
- Create: `components/v2/features/overview/rail.tsx`

The rail decides which body to render (A, B, or C) based on selection and cross-fades between them. Body components are imported but stubbed for this task — they'll exist as files but only `RailAttentionQueue` is wired in fully here. The other two render placeholder content until Tasks 7 and 8.

Actually — to avoid placeholder noise, defer wiring B/C to Task 8 and Task 9. For this task, build the shell that only knows State A.

- [ ] **Step 1: Create `rail.tsx`**

Create `components/v2/features/overview/rail.tsx`:

```tsx
'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CardAura } from './card-aura'
import { RailAttentionQueue } from './rail-attention-queue'
import { RailNodeDetail } from './rail-node-detail'
import { RailOutputDetail } from './rail-output-detail'
import type { ComputedAttentionItem } from './attention'
import type { PipelineNode } from './pipeline-types'

interface RailProps {
  selectedNode: PipelineNode | null
  attention: { items: ComputedAttentionItem[]; overflow: number }
  nextPublishAt: string
  attestedCount: number
  pendingCount: number
  failedCount: number
  onClearSelection: () => void
  onAttentionRowSelect: (nodeId: string) => void
  onHoverDimSet: (nodeIds: string[] | null) => void
}

export function Rail(props: RailProps) {
  const { selectedNode } = props

  // Decide which state to render. Output-node detail takes precedence.
  const state: 'A' | 'B' | 'C' =
    selectedNode === null
      ? 'A'
      : selectedNode.id === 'pub-attest'
        ? 'C'
        : 'B'

  return (
    <aside
      aria-label="Pipeline status panel"
      className="relative w-[320px] shrink-0 overflow-hidden rounded-2xl border border-v2-border/30 bg-v2-surface/40 backdrop-blur-[12px]"
    >
      <CardAura variant="warm" id="rail" blobX={20} blobY={92} />

      <div className="relative z-10 h-full">
        <AnimatePresence mode="wait" initial={false}>
          {state === 'A' && (
            <motion.div
              key="A"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              <RailAttentionQueue
                attention={props.attention}
                nextPublishAt={props.nextPublishAt}
                attestedCount={props.attestedCount}
                pendingCount={props.pendingCount}
                failedCount={props.failedCount}
                onAttentionRowSelect={props.onAttentionRowSelect}
                onHoverDimSet={props.onHoverDimSet}
              />
            </motion.div>
          )}
          {state === 'B' && selectedNode && (
            <motion.div
              key={`B-${selectedNode.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              <RailNodeDetail node={selectedNode} onBack={props.onClearSelection} />
            </motion.div>
          )}
          {state === 'C' && selectedNode && (
            <motion.div
              key={`C-${selectedNode.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
              className="h-full"
            >
              <RailOutputDetail node={selectedNode} onBack={props.onClearSelection} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  )
}
```

This will fail to compile until Tasks 7, 8, 9 create the body components. Stub them to make the build green:

- [ ] **Step 2: Create stubs for the three rail bodies**

Create `components/v2/features/overview/rail-attention-queue.tsx`:

```tsx
'use client'

import type { ComputedAttentionItem } from './attention'

interface Props {
  attention: { items: ComputedAttentionItem[]; overflow: number }
  nextPublishAt: string
  attestedCount: number
  pendingCount: number
  failedCount: number
  onAttentionRowSelect: (nodeId: string) => void
  onHoverDimSet: (nodeIds: string[] | null) => void
}

export function RailAttentionQueue(_: Props) {
  return <div className="p-5 text-xs text-v2-muted">attention queue (stub)</div>
}
```

Create `components/v2/features/overview/rail-node-detail.tsx`:

```tsx
'use client'

import type { PipelineNode } from './pipeline-types'

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailNodeDetail(_: Props) {
  return <div className="p-5 text-xs text-v2-muted">node detail (stub)</div>
}
```

Create `components/v2/features/overview/rail-output-detail.tsx`:

```tsx
'use client'

import type { PipelineNode } from './pipeline-types'

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailOutputDetail(_: Props) {
  return <div className="p-5 text-xs text-v2-muted">output detail (stub)</div>
}
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add components/v2/features/overview/rail.tsx \
        components/v2/features/overview/rail-attention-queue.tsx \
        components/v2/features/overview/rail-node-detail.tsx \
        components/v2/features/overview/rail-output-detail.tsx
git commit -m "feat(v2-overview): rail shell with three-state cross-fade and body stubs"
```

---

## Task 7: Rail State A — attention queue body

**Files:**
- Modify: `components/v2/features/overview/rail-attention-queue.tsx`

Build the real default state: countdown, stage health, attention queue.

- [ ] **Step 1: Replace `rail-attention-queue.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ComputedAttentionItem } from './attention'

interface Props {
  attention: { items: ComputedAttentionItem[]; overflow: number }
  nextPublishAt: string
  attestedCount: number
  pendingCount: number
  failedCount: number
  onAttentionRowSelect: (nodeId: string) => void
  onHoverDimSet: (nodeIds: string[] | null) => void
}

function relativeTime(iso: string, now: number): string {
  const diffMs = now - new Date(iso).getTime()
  if (diffMs < 0) return 'in queue'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  return `${day}d`
}

function Countdown({ targetIso }: { targetIso: string }) {
  const [now, setNow] = useState(() => new Date(targetIso).getTime())
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const ms = Math.max(0, new Date(targetIso).getTime() - now)
  const total = Math.floor(ms / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  return (
    <span
      className="font-mono tabular-nums text-[22px] leading-none text-v2-foreground"
      suppressHydrationWarning
    >
      {mounted ? (
        <>
          <span>{mm}</span>
          <span className="motion-safe:animate-[v2-colon-pulse_1s_ease-in-out_infinite]">
            :
          </span>
          <span>{ss}</span>
        </>
      ) : (
        '—'
      )}
    </span>
  )
}

const KIND_ACCENT: Record<ComputedAttentionItem['kind'], string> = {
  pipeline_failed: 'bg-v2-danger',
  pipeline_pending: 'bg-v2-warning',
  pipeline_held: 'bg-v2-warning',
  counterparty_request: 'bg-v2-info',
  rule_fire: 'bg-v2-muted/60',
}

export function RailAttentionQueue({
  attention,
  nextPublishAt,
  attestedCount,
  pendingCount,
  failedCount,
  onAttentionRowSelect,
  onHoverDimSet,
}: Props) {
  const { items, overflow } = attention

  return (
    <div className="flex h-full flex-col p-5">
      {/* Block 1: Next attestation */}
      <section>
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-v2-muted/70">
          Next attestation
        </p>
        <div className="mt-2.5 flex items-baseline gap-2">
          <Countdown targetIso={nextPublishAt} />
        </div>
        <p className="mt-1.5 text-[11px] leading-none text-v2-muted/70">
          publishing to 3 chains
        </p>
      </section>

      <div className="my-4 h-px bg-v2-border/30" />

      {/* Block 2: Stage health */}
      <section>
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-v2-muted/70">
          Stage health
        </p>
        <div
          className="mt-2.5 flex items-center gap-3 text-[12px] text-v2-foreground/90"
          onMouseEnter={() => onHoverDimSet(null)}
        >
          <span
            className="flex items-center gap-1.5"
            onMouseEnter={(e) => {
              e.stopPropagation()
              onHoverDimSet([]) // attested = show all
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-v2-success" />
            <span className="font-mono tabular-nums">{attestedCount}</span>
            <span className="text-v2-muted">attested</span>
          </span>
          <span
            className="flex items-center gap-1.5 cursor-default"
            onMouseEnter={(e) => {
              e.stopPropagation()
              const pendingIds = items
                .filter((i) => i.kind === 'pipeline_pending' || i.kind === 'pipeline_held')
                .map((i) => 'nodeId' in i ? i.nodeId : '')
                .filter(Boolean)
              onHoverDimSet(pendingIds)
            }}
            onMouseLeave={() => onHoverDimSet(null)}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-v2-warning" />
            <span className="font-mono tabular-nums">{pendingCount}</span>
            <span className="text-v2-muted">pending</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-v2-danger" />
            <span className="font-mono tabular-nums">{failedCount}</span>
            <span className="text-v2-muted">failed</span>
          </span>
        </div>
      </section>

      <div className="my-4 h-px bg-v2-border/30" />

      {/* Block 3: Attention queue */}
      <section className="min-h-0 flex-1 overflow-y-auto">
        <p className="text-[10px] font-medium uppercase leading-none tracking-[0.14em] text-v2-muted/70">
          Needs your attention
        </p>

        {items.length === 0 ? (
          <p className="mt-3 text-[11px] text-v2-muted/70">Nothing needs attention</p>
        ) : (
          <ul className="mt-2.5 space-y-0.5">
            {items.map((item, idx) => {
              const isPipeline =
                item.kind === 'pipeline_failed' ||
                item.kind === 'pipeline_pending' ||
                item.kind === 'pipeline_held'
              const onEnter = () => {
                if (isPipeline && 'nodeId' in item) {
                  onHoverDimSet([item.nodeId])
                }
              }
              const onLeave = () => onHoverDimSet(null)
              const content = (
                <div
                  className={cn(
                    'group flex w-full items-start gap-2 rounded-md px-2 py-2 text-left',
                    'transition-colors hover:bg-v2-foreground/[0.04]'
                  )}
                >
                  <span
                    className={cn(
                      'mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                      KIND_ACCENT[item.kind]
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] leading-tight text-v2-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 truncate text-[10.5px] text-v2-muted/80">
                      {item.detail}
                    </p>
                  </div>
                </div>
              )
              if (isPipeline && 'nodeId' in item) {
                return (
                  <li key={`${item.kind}-${idx}`}>
                    <button
                      type="button"
                      className="w-full"
                      onClick={() => onAttentionRowSelect(item.nodeId)}
                      onMouseEnter={onEnter}
                      onMouseLeave={onLeave}
                    >
                      {content}
                    </button>
                  </li>
                )
              }
              return (
                <li key={`${item.kind}-${idx}`}>
                  <Link
                    href={item.href}
                    className="block"
                    onMouseEnter={onEnter}
                    onMouseLeave={onLeave}
                  >
                    {content}
                  </Link>
                </li>
              )
            })}
            {overflow > 0 && (
              <li>
                <Link
                  href="/v2/alerts"
                  className="block px-2 py-1.5 text-[11px] text-v2-muted hover:text-v2-foreground"
                >
                  +{overflow} more
                </Link>
              </li>
            )}
          </ul>
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/overview/rail-attention-queue.tsx
git commit -m "feat(v2-overview): rail State A — countdown + stage health + attention queue"
```

---

## Task 8: Rail State B — node detail body

**Files:**
- Modify: `components/v2/features/overview/rail-node-detail.tsx`

Migrate content from the old `node-detail-panel.tsx` (Inputs / Output / Provenance / Schedule) into the rail surface, with a `← back` button.

- [ ] **Step 1: Replace `rail-node-detail.tsx`**

```tsx
'use client'

import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PipelineNode, PipelineStatus } from './pipeline-types'

const STATUS_PILL: Record<PipelineStatus, string> = {
  attested: 'border-v2-success/30 bg-v2-success/10 text-v2-success',
  pending: 'border-v2-warning/30 bg-v2-warning/10 text-v2-warning',
  failed: 'border-v2-danger/40 bg-v2-danger/10 text-v2-danger',
}

const STATUS_LABEL: Record<PipelineStatus, string> = {
  attested: 'Attested',
  pending: 'Pending',
  failed: 'Failed',
}

function fmtAbsolute(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(d)
}

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailNodeDetail({ node, onBack }: Props) {
  return (
    <div className="flex h-full flex-col">
      <RailHeader node={node} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] leading-relaxed text-v2-muted">
          {node.data.description}
        </p>
        <Section title="Inputs">
          <DefList items={node.data.inputs} />
        </Section>
        <Section title="Output">
          <DefList items={[node.data.output]} accent />
        </Section>
        <Section title="Provenance">
          <DefList
            items={[
              { label: 'Signing key', value: node.data.provenance.signingKey },
              { label: 'Proof type',  value: node.data.provenance.proofType },
              { label: 'Reference',   value: node.data.provenance.reference },
            ]}
          />
        </Section>
        <Section title="Schedule">
          <DefList
            items={[
              { label: 'Cadence',   value: node.data.cadence },
              { label: 'Last run',  value: fmtAbsolute(node.data.lastRunAt) },
              { label: 'Next run',  value: fmtAbsolute(node.data.nextRunAt) },
            ]}
          />
        </Section>
      </div>
    </div>
  )
}

export function RailHeader({ node, onBack }: { node: PipelineNode; onBack: () => void }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-v2-border/30 px-5 py-4">
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to status panel"
        className={cn(
          'shrink-0 rounded-md p-1 text-v2-muted transition-colors',
          'hover:bg-v2-foreground/[0.05] hover:text-v2-foreground',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground'
        )}
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
      </button>
      <h2 className="min-w-0 flex-1 truncate text-[16px] font-medium leading-tight tracking-tight text-v2-foreground">
        {node.data.label}
      </h2>
      <span
        className={cn(
          'shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em]',
          STATUS_PILL[node.data.status]
        )}
      >
        <span className="h-1 w-1 rounded-full bg-current" />
        {STATUS_LABEL[node.data.status]}
      </span>
    </header>
  )
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 border-t border-v2-border/30 pt-4 first-of-type:mt-5 first-of-type:border-t-0 first-of-type:pt-3">
      <p className="text-[10px] font-medium uppercase leading-none tracking-[0.12em] text-v2-muted/60">
        {title}
      </p>
      <div className="mt-2.5">{children}</div>
    </section>
  )
}

export function DefList({
  items,
  accent,
}: {
  items: { label: string; value: string }[]
  accent?: boolean
}) {
  return (
    <dl className="space-y-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-baseline justify-between gap-3 text-[12.5px]"
        >
          <dt className="shrink-0 text-v2-muted">{it.label}</dt>
          <dd
            className={cn(
              'min-w-0 flex-1 truncate text-right font-mono tabular-nums',
              accent ? 'font-medium text-v2-foreground' : 'text-v2-foreground/90'
            )}
            title={it.value}
          >
            {it.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/overview/rail-node-detail.tsx
git commit -m "feat(v2-overview): rail State B — node detail body"
```

---

## Task 9: Rail State C — output-node detail with Live NAV + consumer deliveries

**Files:**
- Modify: `components/v2/features/overview/rail-output-detail.tsx`

State C is State B + two extra sections (Live NAV in display serif, Consumer deliveries list). Reuses the shared bits from Task 8 (`RailHeader`, `Section`, `DefList`).

- [ ] **Step 1: Replace `rail-output-detail.tsx`**

```tsx
'use client'

import type { PipelineNode } from './pipeline-types'
import { DefList, RailHeader, Section } from './rail-node-detail'

function fmtAbsolute(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(d)
}

function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = now - new Date(iso).getTime()
  if (diffMs < 0) return 'in queue'
  const sec = Math.floor(diffMs / 1000)
  if (sec < 45) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  return `${hr}h ago`
}

interface Props {
  node: PipelineNode
  onBack: () => void
}

export function RailOutputDetail({ node, onBack }: Props) {
  const totalNav = node.data.inputs.find((i) => i.label === 'nav')?.value ?? '—'
  const perShare = node.data.inputs.find((i) => i.label === 'nav/sh')?.value ?? '—'
  const deliveries = node.data.consumerDeliveries ?? []
  const isStale = node.data.status === 'failed'

  return (
    <div className="flex h-full flex-col">
      <RailHeader node={node} onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] leading-relaxed text-v2-muted">
          {node.data.description}
        </p>

        <Section title="Live NAV">
          <div className="space-y-1">
            <p className="font-serif text-[28px] leading-none tracking-tight text-v2-foreground">
              {totalNav}
            </p>
            <p className="font-mono text-[14px] tabular-nums text-v2-foreground/80">
              {perShare} per share
            </p>
            <p
              className="font-mono text-[11px] tabular-nums text-v2-muted/70"
              suppressHydrationWarning
            >
              as of {fmtAbsolute(node.data.lastRunAt)}
              {isStale && (
                <span className="ml-1.5 inline-flex items-center rounded-sm border border-v2-danger/40 bg-v2-danger/10 px-1 py-px text-[10px] uppercase tracking-[0.1em] text-v2-danger">
                  stale
                </span>
              )}
            </p>
          </div>
        </Section>

        <Section title="Consumer deliveries">
          {deliveries.length === 0 ? (
            <p className="text-[11px] text-v2-muted/70">No subscribed consumers</p>
          ) : (
            <ul className="space-y-2.5">
              {deliveries.map((d) => (
                <li
                  key={d.name}
                  className="flex items-start justify-between gap-3 text-[12px]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-v2-foreground">{d.name}</p>
                    <p className="truncate text-[10.5px] text-v2-muted/70">{d.network}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p
                      className="font-mono tabular-nums text-v2-foreground/80"
                      suppressHydrationWarning
                    >
                      {relativeTime(d.lastDeliveryAt)}
                    </p>
                    <p className="font-mono text-[10px] text-v2-muted/60">{d.payloadRef}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Inputs">
          <DefList items={node.data.inputs} />
        </Section>
        <Section title="Output">
          <DefList items={[node.data.output]} accent />
        </Section>
        <Section title="Provenance">
          <DefList
            items={[
              { label: 'Signing key', value: node.data.provenance.signingKey },
              { label: 'Proof type',  value: node.data.provenance.proofType },
              { label: 'Reference',   value: node.data.provenance.reference },
            ]}
          />
        </Section>
        <Section title="Schedule">
          <DefList
            items={[
              { label: 'Cadence',  value: node.data.cadence },
              { label: 'Last run', value: fmtAbsolute(node.data.lastRunAt) },
              { label: 'Next run', value: fmtAbsolute(node.data.nextRunAt) },
            ]}
          />
        </Section>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/v2/features/overview/rail-output-detail.tsx
git commit -m "feat(v2-overview): rail State C — Live NAV + consumer deliveries on pub-attest"
```

---

## Task 10: Compose new Overview, drop KpiStrip and node-detail-panel

**Files:**
- Modify: `components/v2/features/overview/overview.tsx`
- Modify: `components/v2/features/overview/index.ts`
- Delete: `components/v2/features/overview/kpi-strip.tsx`
- Delete: `components/v2/features/overview/node-detail-panel.tsx`

The Overview now renders: page header (eyebrow + serif fund name + Live pill + as-of UTC), then a single flex row containing the DAG canvas (naked) and the Rail (320px).

- [ ] **Step 1: Replace `overview.tsx`**

```tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { computeAttention } from './attention'
import { PipelineGraph } from './pipeline-graph'
import { Rail } from './rail'
import { overviewPipeline } from './pipeline-fixture'

interface OverviewProps {
  fundName?: string
}

function fmtAsOf(t: number): string {
  const d = new Date(t)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`
}

export function Overview({ fundName = 'ACRED' }: OverviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dimNodeIds, setDimNodeIds] = useState<string[] | null>(null)

  // Live as-of clock — updates each second, SSR-safe.
  const [asOf, setAsOf] = useState(() => fmtAsOf(Date.now()))
  useEffect(() => {
    const id = window.setInterval(() => setAsOf(fmtAsOf(Date.now())), 1000)
    return () => window.clearInterval(id)
  }, [])

  const selectedNode = useMemo(
    () =>
      selectedId
        ? overviewPipeline.nodes.find((n) => n.id === selectedId) ?? null
        : null,
    [selectedId]
  )

  const attention = useMemo(() => computeAttention(overviewPipeline), [])

  const { attestedCount, pendingCount, failedCount } = useMemo(() => {
    let a = 0,
      p = 0,
      f = 0
    for (const n of overviewPipeline.nodes) {
      if (n.data.status === 'attested') a++
      else if (n.data.status === 'pending') p++
      else if (n.data.status === 'failed') f++
    }
    return { attestedCount: a, pendingCount: p, failedCount: f }
  }, [])

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col gap-6 py-2">
      {/* Page header */}
      <header className="flex shrink-0 flex-col gap-2.5">
        <div className="flex items-center justify-between text-[11px] leading-none">
          <span className="font-mono uppercase tracking-[0.16em] text-v2-muted/70">
            // overview
          </span>
          <span
            className="font-mono tabular-nums text-v2-muted/70"
            suppressHydrationWarning
          >
            as of {asOf}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="flex items-baseline gap-2 font-serif text-[28px] leading-none tracking-tight text-v2-foreground">
            <span>{fundName}</span>
            <span className="font-sans text-[13px] tracking-normal text-v2-muted">
              · Apollo Diversified Credit
            </span>
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-v2-border/50 px-2.5 py-1">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inset-0 animate-ping rounded-full bg-v2-foreground/40 motion-reduce:hidden" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-v2-foreground" />
            </span>
            <span className="text-[11px] font-medium leading-none text-v2-muted/70">
              {failedCount > 0
                ? `Live · ${failedCount} failed`
                : pendingCount > 0
                  ? `Live · ${pendingCount} pending`
                  : 'Live'}
            </span>
          </span>
        </div>
      </header>

      {/* DAG canvas (naked) + glass rail */}
      <div className="flex min-h-0 flex-1 gap-6">
        <div className="relative min-w-0 flex-1">
          <ReactFlowProvider>
            <PipelineGraph
              pipeline={overviewPipeline}
              selectedId={selectedId}
              onSelect={setSelectedId}
              dimNodeIds={dimNodeIds}
            />
          </ReactFlowProvider>
        </div>
        <Rail
          selectedNode={selectedNode}
          attention={attention}
          nextPublishAt={overviewPipeline.kpi.nextPublishAt}
          attestedCount={attestedCount}
          pendingCount={pendingCount}
          failedCount={failedCount}
          onClearSelection={() => setSelectedId(null)}
          onAttentionRowSelect={(id) => setSelectedId(id)}
          onHoverDimSet={setDimNodeIds}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wire the `dimNodeIds` prop through `pipeline-graph.tsx`**

The Overview passes `dimNodeIds` down; `PipelineGraph` needs to accept it and pass an opacity through to nodes that aren't dimmed.

In `components/v2/features/overview/pipeline-graph.tsx`, widen the `PipelineGraphProps` interface:

```ts
interface PipelineGraphProps {
  pipeline: PipelineFixture
  selectedId: string | null
  onSelect: (id: string | null) => void
  dimNodeIds?: string[] | null
}
```

In the `PipelineGraph` function signature, destructure `dimNodeIds`:

```ts
export function PipelineGraph({
  pipeline,
  selectedId,
  onSelect,
  dimNodeIds,
}: PipelineGraphProps) {
```

In the `flowNodes` `useMemo`, attach a `style.opacity` if a dim list is present:

```tsx
const flowNodes: Node<PipelineNodeData>[] = useMemo(() => {
  const isDimming = Array.isArray(dimNodeIds) && dimNodeIds.length > 0
  return pipeline.nodes.map((n) => {
    const isHighlit = isDimming ? dimNodeIds!.includes(n.id) : true
    return {
      id: n.id,
      type: 'pipeline',
      data: n.data,
      position: positions.get(n.id) ?? { x: 0, y: 0 },
      selected: n.id === selectedId,
      style: isHighlit ? undefined : { opacity: 0.25, transition: 'opacity 150ms ease-out' },
    }
  })
}, [pipeline.nodes, positions, selectedId, dimNodeIds])
```

- [ ] **Step 3: Update `index.ts`**

Open `components/v2/features/overview/index.ts`. Remove any export of `KpiStrip` / `NodeDetailPanel`. Add the `Rail` export if needed by other consumers; otherwise `Overview` is the public surface and the index only exports it. Replace the file contents with:

```ts
export { Overview } from './overview'
```

- [ ] **Step 4: Delete deprecated files**

```bash
rm components/v2/features/overview/kpi-strip.tsx
rm components/v2/features/overview/node-detail-panel.tsx
```

- [ ] **Step 5: Run typecheck and tests**

Run: `pnpm typecheck && pnpm test attention`
Expected: PASS

- [ ] **Step 6: Lint**

Run: `pnpm lint`
Expected: no errors. If there are warnings about unused imports in old files, fix them.

- [ ] **Step 7: Visual verification — full page**

With the dev server running, navigate Playwright to `/v2`.

Verify against spec §12 acceptance criteria, item by item:
1. Single header line (eyebrow + as-of right) and the fund-name row below; no KPI strip
2. DAG has no card frame; grid dots visible through it; chip-tablet nodes
3. No `SOURCE · VALIDATE · …` column headers
4. Rail default state shows ONLY: countdown, stage health, attention queue
5. Clicking a non-output node morphs the rail into State B (back button + Inputs / Output / Provenance / Schedule)
6. Clicking `pub-attest` morphs into State C (Live NAV display serif + Consumer deliveries + standard B sections; `pub-attest`'s own footer already shows the NAV value and `next MM:SS`)
7. Attention queue is ranked per §5, capped at 5, `+N more` links to `/v2/alerts` (if more than 5)
8. Hovering "N pending" or a pipeline attention row dims unrelated DAG nodes (opacity ≈ 0.25)
9. Keyboard: Tab through nodes, Enter selects, Esc returns to State A
10. `prefers-reduced-motion`: colon pulse, edge trails, aura ping all suppressed

Iterate per the visual-fix loop if anything fails the criteria.

- [ ] **Step 8: Commit**

```bash
git add components/v2/features/overview/overview.tsx \
        components/v2/features/overview/pipeline-graph.tsx \
        components/v2/features/overview/index.ts
git add -A components/v2/features/overview/   # picks up deletions
git commit -m "feat(v2-overview): compose mission-control layout; drop KpiStrip and standalone panel"
```

---

## Task 11: Polish + a11y + reduced-motion verification

**Files:**
- Possibly minor edits across components from Tasks 4, 6, 7

This is a verification + cleanup pass. No new files, but expect small adjustments.

- [ ] **Step 1: Keyboard nav check**

With dev server running and Playwright open at `/v2`:

- Tab into the DAG. Verify Tab visits each node in some sensible order (phase-left-to-right is ideal, but React Flow's default tab order may differ — accept any deterministic order).
- Enter on a focused node selects it; rail morphs to State B/C.
- Esc returns to State A.
- Tab into the rail's attention queue rows; each row is reachable; Enter activates it.

If any of these fail (e.g., Esc not wired), add a keydown listener in `Overview` that handles Escape → `setSelectedId(null)`:

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setSelectedId(null)
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [])
```

- [ ] **Step 2: Reduced-motion check**

In Playwright, set the prefers-reduced-motion media query (via `mcp__playwright__browser_evaluate` or a CSS-emulation toggle in the browser tab). Reload `/v2` and verify:

- The Live pill's ping is hidden (the `motion-reduce:hidden` class on the inner span handles this).
- The rail countdown colon does not pulse (the `motion-safe:` prefix on the `animate-[v2-colon-pulse_...]` class only enables it when motion is allowed).
- The edge-trail animation does not play (CSS `@media (prefers-reduced-motion: reduce)` override).

If any of these fail, audit the offending component for missing `motion-reduce:` utility or missing `@media (prefers-reduced-motion)` block.

- [ ] **Step 3: Dark-mode check**

Toggle the v2 sidebar's `DARK` button (or set the system theme). Reload `/v2` and verify the page reads cleanly in dark mode:

- Glass tint adapts (rail surface should still feel translucent against the dark background)
- Status dot glows are visible but not blown out
- Edge stroke colour reads against dark
- Display-serif NAV (when State C is open) is legible

If anything reads broken, adjust the relevant CSS-variable usage or opacity.

- [ ] **Step 4: Final commit if any adjustments were made**

```bash
git add -A components/v2/features/overview/
git commit -m "fix(v2-overview): a11y + reduced-motion polish"
```

If no changes were needed, skip the commit.

---

## Done criteria

Plan execution is complete when:
- All 11 tasks committed
- `pnpm typecheck` clean
- `pnpm lint` clean
- `pnpm test` passes (the new `attention.test.ts` is included)
- The 10 acceptance items in spec §12 are visually verified via Playwright in light + dark mode with reduced-motion respected
