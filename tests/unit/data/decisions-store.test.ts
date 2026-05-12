import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'

beforeEach(() => store.__resetForTests())

describe('decisions store', () => {
  it('exposes mutable arrays for each decision kind', () => {
    expect(store.getAcknowledgedFlags()).toEqual([])
    expect(store.getDismissedAnomalies()).toEqual([])
    expect(store.getThresholds()).toEqual([])
    expect(store.getWatchEntries()).toEqual([])
    expect(store.getIssuerRequests()).toEqual([])
    expect(store.getAlertRules()).toEqual([])
    expect(store.getAlertChannels()).toEqual([])
  })

  it('seeds a single draft memo for ACRED', () => {
    const memos = store.getMemos()
    expect(memos.length).toBe(1)
    expect(memos[0].datasetId).toBe('ds_acred')
    expect(memos[0].status).toBe('draft')
  })

  it('appendXxx() mutations are visible to subsequent getXxx() calls', () => {
    store.appendAcknowledgedFlag({
      flagId: 'f1', datasetId: 'ds_acred', acknowledgedBy: 'u1',
      acknowledgedAt: '2026-05-12T10:00:00.000Z', note: 'ok',
    })
    expect(store.getAcknowledgedFlags()).toHaveLength(1)
  })
})
