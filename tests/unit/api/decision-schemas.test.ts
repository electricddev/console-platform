import { describe, it, expect } from 'vitest'
import {
  AcknowledgedFlagSchema, DismissedAnomalySchema, ThresholdSchema,
  WatchEntrySchema, NotificationChannelKindSchema, ThresholdDirectionSchema,
} from '@/lib/api/schemas'

describe('decision-state schemas', () => {
  it('AcknowledgedFlagSchema parses with optional expiresAt', () => {
    expect(() => AcknowledgedFlagSchema.parse({
      flagId: 'acred.leverage_high', datasetId: 'ds_acred',
      acknowledgedBy: 'u1', acknowledgedAt: '2026-05-12T10:00:00.000Z',
      note: 'IC accepted the elevated leverage profile.',
    })).not.toThrow()
  })

  it('ThresholdSchema enforces direction enum', () => {
    expect(() => ThresholdSchema.parse({
      id: 't1', ruleId: 'acred.leverage_high', datasetId: 'ds_acred',
      metric: 'leverage', value: 0.80, direction: 'sideways',
      setBy: 'u1', setAt: '2026-05-12T10:00:00.000Z',
    })).toThrow()
  })

  it('WatchEntrySchema defaults channels=[]', () => {
    const parsed = WatchEntrySchema.parse({
      datasetId: 'ds_acred', userId: 'u1', watchedAt: '2026-05-12T10:00:00.000Z',
    })
    expect(parsed.channels).toEqual([])
  })

  it('NotificationChannelKindSchema is closed', () => {
    expect(NotificationChannelKindSchema.options).toEqual(['slack', 'email', 'webhook'])
  })

  it('ThresholdDirectionSchema is closed', () => {
    expect(ThresholdDirectionSchema.options).toEqual(['above', 'below'])
  })

  it('DismissedAnomalySchema parses', () => {
    expect(() => DismissedAnomalySchema.parse({
      anomalyId: 'evt_1', dismissedBy: 'u1',
      dismissedAt: '2026-05-12T10:00:00.000Z', reason: 'Already in the memo.',
    })).not.toThrow()
  })
})
