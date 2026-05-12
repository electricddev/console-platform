import { z } from 'zod'
import { mockEndpoint, type RequestContext } from '@/lib/api/client'
import {
  AlertChannelSchema, AlertRuleSchema, AnomalyEventSchema, ThresholdDirectionSchema,
  type AlertChannel, type AlertRule, type AnomalyEvent,
} from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'
import { acredAnomalyFeed } from '@/lib/data/acred/anomalies'
import { peerAnomalyEvents } from '@/lib/data/acred/alerts-feed'

// Suppress unused-import warning — ThresholdDirectionSchema is used transitively by AlertRuleSchema.
void ThresholdDirectionSchema

type AlertFilter = {
  kinds?: AnomalyEvent['kind'][]
  severities?: AnomalyEvent['severity'][]
  datasetIds?: string[]
}

// Synthetic test-rule events live in-memory and self-evict after 30s.
const _ephemeralEvents: { event: AnomalyEvent; expiresAt: number }[] = []

function activeEphemeralEvents(): AnomalyEvent[] {
  const now = Date.now()
  while (_ephemeralEvents.length && _ephemeralEvents[0].expiresAt < now) {
    _ephemeralEvents.shift()
  }
  return _ephemeralEvents.map((e) => e.event)
}

function matchesDataset(e: AnomalyEvent, datasetIds: string[]): boolean {
  if (datasetIds.length === 0) return true
  return datasetIds.some((id) => (e.detailHref ?? '').includes(id))
}

export const listAlertEvents = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, filter: AlertFilter = {}): Promise<AnomalyEvent[]> => {
    const dismissed = new Set(store.getDismissedAnomalies().map((d) => d.anomalyId))
    const all = [
      ...acredAnomalyFeed.map((e) => ({ ...e, detailHref: e.detailHref ?? '/datasets/ds_acred' })),
      ...peerAnomalyEvents,
      ...activeEphemeralEvents(),
    ]
      .filter((e) => !dismissed.has(e.id))
      .filter((e) => !filter.kinds       || filter.kinds.length       === 0 || filter.kinds.includes(e.kind))
      .filter((e) => !filter.severities  || filter.severities.length  === 0 || filter.severities.includes(e.severity))
      .filter((e) => matchesDataset(e, filter.datasetIds ?? []))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
    return z.array(AnomalyEventSchema).parse(all)
  },
  { latencyMs: 140 }
)

// ---------- Rules ----------

export const listAlertRules = mockEndpoint(
  async (_ctx: RequestContext): Promise<AlertRule[]> => {
    return z.array(AlertRuleSchema).parse(store.getAlertRules())
  },
  { latencyMs: 80 }
)

export const createAlertRule = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: Omit<AlertRule, 'id' | 'createdBy' | 'createdAt' | 'enabled'> & { enabled?: boolean }): Promise<AlertRule> => {
    const rule: AlertRule = {
      id: `rule_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdBy: ctx.user?.id ?? 'anonymous',
      createdAt: new Date().toISOString(),
      enabled: true,
      ...payload,
    }
    store.appendAlertRule(rule)
    return AlertRuleSchema.parse(rule)
  },
  { latencyMs: 100 }
)

export const updateAlertRule = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, ruleId: string, patch: Partial<AlertRule>): Promise<AlertRule | undefined> => {
    const next = store.replaceAlertRule(ruleId, patch)
    return next ? AlertRuleSchema.parse(next) : undefined
  },
  { latencyMs: 80 }
)

export const deleteAlertRule = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, ruleId: string): Promise<void> => {
    store.removeAlertRule(ruleId)
  },
  { latencyMs: 60 }
)

export const testAlertRule = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, ruleId: string): Promise<AnomalyEvent> => {
    const rule = store.getAlertRules().find((r) => r.id === ruleId)
    const event: AnomalyEvent = {
      id: `test_${ruleId}_${Date.now()}`,
      occurredAt: new Date().toISOString(),
      kind: 'amm-sla', severity: 'low',
      title: `Test event for rule "${rule?.label ?? ruleId}"`,
      borrowerNormalized: null, detailHref: null,
    }
    _ephemeralEvents.push({ event, expiresAt: Date.now() + 30_000 })
    return AnomalyEventSchema.parse(event)
  },
  { latencyMs: 80 }
)

// ---------- Channels ----------

export const listAlertChannels = mockEndpoint(
  async (_ctx: RequestContext): Promise<AlertChannel[]> => {
    return z.array(AlertChannelSchema).parse(store.getAlertChannels())
  },
  { latencyMs: 80 }
)

export const createAlertChannel = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: Omit<AlertChannel, 'id' | 'createdBy' | 'createdAt'>): Promise<AlertChannel> => {
    const channel: AlertChannel = {
      id: `ch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdBy: ctx.user?.id ?? 'anonymous',
      createdAt: new Date().toISOString(),
      ...payload,
    }
    store.appendAlertChannel(channel)
    return AlertChannelSchema.parse(channel)
  },
  { latencyMs: 100 }
)

export const deleteAlertChannel = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, channelId: string): Promise<void> => {
    store.removeAlertChannel(channelId)
  },
  { latencyMs: 60 }
)

export const sendTestEvent = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, channelId: string): Promise<{ delivered: true } | { delivered: false; reason: string }> => {
    const ch = store.getAlertChannels().find((c) => c.id === channelId)
    if (!ch) return { delivered: false, reason: 'channel-not-found' }
    // Mocked dispatch — no real network call.
    return { delivered: true }
  },
  { latencyMs: 200 }
)
