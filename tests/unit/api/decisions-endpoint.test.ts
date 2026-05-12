// tests/unit/api/decisions-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import {
  listAcknowledgedFlags, acknowledgeFlag, snoozeFlag,
  listDismissedAnomalies, dismissAnomaly,
  listThresholds, setThreshold,
  listWatchEntries, setWatch, clearWatch,
} from '@/lib/api/endpoints/decisions'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }
beforeEach(() => store.__resetForTests())

describe('decisions endpoints', () => {
  it('acknowledgeFlag round-trips through the store', async () => {
    await acknowledgeFlag(ctx, { flagId: 'acred.leverage_high', datasetId: 'ds_acred', note: 'ok' })
    const list = await listAcknowledgedFlags(ctx, 'ds_acred')
    expect(list).toHaveLength(1)
    expect(list[0].flagId).toBe('acred.leverage_high')
  })

  it('snoozeFlag sets expiresAt 7 days out', async () => {
    await snoozeFlag(ctx, { flagId: 'acred.pik_rising', datasetId: 'ds_acred' })
    const list = await listAcknowledgedFlags(ctx, 'ds_acred')
    const entry = list[0]
    expect(entry.expiresAt).toBeTruthy()
    const days = (new Date(entry.expiresAt!).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(6.9)
    expect(days).toBeLessThan(7.1)
  })

  it('listAcknowledgedFlags filters by datasetId and excludes expired entries', async () => {
    store.appendAcknowledgedFlag({
      flagId: 'expired', datasetId: 'ds_acred', acknowledgedBy: 'u1',
      acknowledgedAt: new Date(Date.now() - 14 * 86_400_000).toISOString(),
      note: 'old', expiresAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    })
    store.appendAcknowledgedFlag({
      flagId: 'live', datasetId: 'ds_acred', acknowledgedBy: 'u1',
      acknowledgedAt: new Date().toISOString(),
      note: 'ok',
    })
    const list = await listAcknowledgedFlags(ctx, 'ds_acred')
    expect(list.map((f) => f.flagId)).toEqual(['live'])
  })

  it('dismissAnomaly round-trips', async () => {
    await dismissAnomaly(ctx, { anomalyId: 'evt_1', reason: 'already in memo' })
    const list = await listDismissedAnomalies(ctx)
    expect(list).toHaveLength(1)
  })

  it('setThreshold persists a Threshold entry', async () => {
    await setThreshold(ctx, {
      ruleId: 'acred.leverage_high', datasetId: 'ds_acred',
      metric: 'leverage', value: 0.85, direction: 'above',
    })
    const list = await listThresholds(ctx, 'ds_acred')
    expect(list[0].value).toBe(0.85)
  })

  it('setWatch upserts; clearWatch removes', async () => {
    await setWatch(ctx, { datasetId: 'ds_acred', channels: ['slack'] })
    expect(await listWatchEntries(ctx, ctx.user.id)).toHaveLength(1)
    await setWatch(ctx, { datasetId: 'ds_acred', channels: ['slack', 'email'] })
    const after = await listWatchEntries(ctx, ctx.user.id)
    expect(after[0].channels).toEqual(['slack', 'email'])
    await clearWatch(ctx, 'ds_acred')
    expect(await listWatchEntries(ctx, ctx.user.id)).toHaveLength(0)
  })
})
