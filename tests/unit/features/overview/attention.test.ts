import { describe, it, expect } from 'vitest'
import { computeAttention } from '@/components/v2/features/overview/attention'
import type { AttentionItem, PipelineFixture, PipelineNode } from '@/components/v2/features/overview/pipeline-types'

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
