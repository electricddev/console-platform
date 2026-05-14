import type { AttentionItem, PipelineFixture } from './pipeline-types'
import { OUTPUT_NODE_ID } from './node-ids'

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

/** Maximum attention items shown in the rail; the rest surface as a "+N more" overflow row. */
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
      // Static items: newest first.
      return new Date(b.at).getTime() - new Date(a.at).getTime()
    }
    // Pipeline items of the same kind: oldest first, so longer-standing problems surface higher.
    return new Date(a.at).getTime() - new Date(b.at).getTime()
  })

  const total = items.length
  return {
    items: items.slice(0, CAP),
    overflow: Math.max(0, total - CAP),
  }
}
