// tests/unit/api/alerts-endpoint.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import * as store from '@/lib/api/fixtures/decisions'
import {
  listAlertEvents, listAlertRules, createAlertRule, updateAlertRule, deleteAlertRule,
  testAlertRule, listAlertChannels, createAlertChannel, deleteAlertChannel, sendTestEvent,
} from '@/lib/api/endpoints/alerts'

const ctx = { user: { id: 'u1', orgId: 'o1', role: 'counterparty' as const } }
beforeEach(() => store.__resetForTests())

describe('alerts endpoints', () => {
  it('listAlertEvents aggregates ACRED + peer feeds', async () => {
    const events = await listAlertEvents(ctx)
    expect(events.length).toBeGreaterThanOrEqual(16)
    events.forEach((e) => expect(e.id).toBeTruthy())
  })

  it('listAlertEvents filters by kind', async () => {
    const filings = await listAlertEvents(ctx, { kinds: ['filing'] })
    filings.forEach((e) => expect(e.kind).toBe('filing'))
    expect(filings.length).toBeGreaterThan(0)
  })

  it('createAlertRule, updateAlertRule, deleteAlertRule round-trip', async () => {
    const rule = await createAlertRule(ctx, {
      label: 'leverage spike', enabled: true,
      condition: { metric: 'leverage', threshold: 0.75, direction: 'above' },
      scope: { datasetIds: [], kinds: [], severities: [] }, channelIds: [],
    })
    expect((await listAlertRules(ctx))).toHaveLength(1)
    await updateAlertRule(ctx, rule.id, { enabled: false })
    expect((await listAlertRules(ctx))[0].enabled).toBe(false)
    await deleteAlertRule(ctx, rule.id)
    expect(await listAlertRules(ctx)).toHaveLength(0)
  })

  it('testAlertRule injects a synthetic event with id prefix test_', async () => {
    const rule = await createAlertRule(ctx, {
      label: 'x', condition: { metric: 'leverage', threshold: 0.5, direction: 'above' },
      scope: { datasetIds: [], kinds: [], severities: [] }, channelIds: [],
    })
    await testAlertRule(ctx, rule.id)
    const events = await listAlertEvents(ctx)
    const synthetic = events.find((e) => e.id.startsWith('test_'))
    expect(synthetic).toBeTruthy()
  })

  it('createAlertChannel and deleteAlertChannel round-trip', async () => {
    const ch = await createAlertChannel(ctx, { kind: 'slack', label: 'risk-team', target: 'https://hooks.slack.com/x' })
    expect(await listAlertChannels(ctx)).toHaveLength(1)
    await deleteAlertChannel(ctx, ch.id)
    expect(await listAlertChannels(ctx)).toHaveLength(0)
  })

  it('sendTestEvent no-ops gracefully on missing channel', async () => {
    await expect(sendTestEvent(ctx, 'ch_nonexistent')).resolves.toEqual({ delivered: false, reason: 'channel-not-found' })
  })

  it('sendTestEvent succeeds for an existing channel', async () => {
    const ch = await createAlertChannel(ctx, { kind: 'webhook', label: 'pager', target: 'https://example.com/x' })
    await expect(sendTestEvent(ctx, ch.id)).resolves.toEqual({ delivered: true })
  })
})
