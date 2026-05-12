// lib/api/endpoints/decisions.ts
import { z } from 'zod'
import { mockEndpoint, type RequestContext } from '@/lib/api/client'
import {
  AcknowledgedFlagSchema, DismissedAnomalySchema, ThresholdSchema, WatchEntrySchema,
  NotificationChannelKindSchema,
  type AcknowledgedFlag, type DismissedAnomaly, type Threshold, type WatchEntry,
  type NotificationChannelKind,
} from '@/lib/api/schemas'
import * as store from '@/lib/api/fixtures/decisions'

const SEVEN_DAYS = 7 * 86_400_000

function isActive(f: AcknowledgedFlag): boolean {
  if (!f.expiresAt) return true
  return new Date(f.expiresAt).getTime() > Date.now()
}

// ---------- Acknowledged flags ----------

export const listAcknowledgedFlags = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, datasetId?: string): Promise<AcknowledgedFlag[]> => {
    const all = store.getAcknowledgedFlags().filter(isActive)
    const scoped = datasetId ? all.filter((f) => f.datasetId === datasetId) : all
    return z.array(AcknowledgedFlagSchema).parse(scoped)
  },
  { latencyMs: 60 }
)

export const acknowledgeFlag = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: { flagId: string; datasetId: string; note: string }): Promise<AcknowledgedFlag> => {
    const entry: AcknowledgedFlag = {
      flagId: payload.flagId, datasetId: payload.datasetId,
      acknowledgedBy: ctx.user?.id ?? 'anonymous',
      acknowledgedAt: new Date().toISOString(),
      note: payload.note,
    }
    store.appendAcknowledgedFlag(entry)
    return AcknowledgedFlagSchema.parse(entry)
  },
  { latencyMs: 80 }
)

export const snoozeFlag = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: { flagId: string; datasetId: string }): Promise<AcknowledgedFlag> => {
    const entry: AcknowledgedFlag = {
      flagId: payload.flagId, datasetId: payload.datasetId,
      acknowledgedBy: ctx.user?.id ?? 'anonymous',
      acknowledgedAt: new Date().toISOString(),
      note: '(snoozed 7d)',
      expiresAt: new Date(Date.now() + SEVEN_DAYS).toISOString(),
    }
    store.appendAcknowledgedFlag(entry)
    return AcknowledgedFlagSchema.parse(entry)
  },
  { latencyMs: 80 }
)

// ---------- Dismissed anomalies ----------

export const listDismissedAnomalies = mockEndpoint(
  async (_ctx: RequestContext): Promise<DismissedAnomaly[]> => {
    return z.array(DismissedAnomalySchema).parse(store.getDismissedAnomalies())
  },
  { latencyMs: 60 }
)

export const dismissAnomaly = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: { anomalyId: string; reason: string }): Promise<DismissedAnomaly> => {
    const entry: DismissedAnomaly = {
      anomalyId: payload.anomalyId,
      dismissedBy: ctx.user?.id ?? 'anonymous',
      dismissedAt: new Date().toISOString(),
      reason: payload.reason,
    }
    store.appendDismissedAnomaly(entry)
    return DismissedAnomalySchema.parse(entry)
  },
  { latencyMs: 80 }
)

// ---------- Thresholds ----------

export const listThresholds = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, datasetId?: string): Promise<Threshold[]> => {
    const all = store.getThresholds()
    const scoped = datasetId ? all.filter((t) => t.datasetId === datasetId) : all
    return z.array(ThresholdSchema).parse(scoped)
  },
  { latencyMs: 60 }
)

export const setThreshold = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: { ruleId: string; datasetId: string; metric: string; value: number; direction: 'above' | 'below' }): Promise<Threshold> => {
    const entry: Threshold = {
      id: `thr_${payload.ruleId}_${Date.now()}`,
      ruleId: payload.ruleId, datasetId: payload.datasetId,
      metric: payload.metric, value: payload.value, direction: payload.direction,
      setBy: ctx.user?.id ?? 'anonymous',
      setAt: new Date().toISOString(),
    }
    store.appendThreshold(entry)
    return ThresholdSchema.parse(entry)
  },
  { latencyMs: 80 }
)

// ---------- Watchlist ----------

export const listWatchEntries = mockEndpoint(
  async (_ctx: RequestContext, _signal: AbortSignal | undefined, userId?: string): Promise<WatchEntry[]> => {
    const all = store.getWatchEntries()
    const scoped = userId ? all.filter((w) => w.userId === userId) : all
    return z.array(WatchEntrySchema).parse(scoped)
  },
  { latencyMs: 60 }
)

export const setWatch = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, payload: { datasetId: string; channels: NotificationChannelKind[] }): Promise<WatchEntry> => {
    const parsedChannels = z.array(NotificationChannelKindSchema).parse(payload.channels)
    const entry: WatchEntry = {
      datasetId: payload.datasetId,
      userId: ctx.user?.id ?? 'anonymous',
      channels: parsedChannels,
      watchedAt: new Date().toISOString(),
    }
    store.upsertWatchEntry(entry)
    return WatchEntrySchema.parse(entry)
  },
  { latencyMs: 80 }
)

export const clearWatch = mockEndpoint(
  async (ctx: RequestContext, _signal: AbortSignal | undefined, datasetId: string): Promise<void> => {
    store.removeWatchEntry(datasetId, ctx.user?.id ?? 'anonymous')
  },
  { latencyMs: 60 }
)
