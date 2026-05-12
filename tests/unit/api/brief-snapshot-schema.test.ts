import { describe, it, expect } from 'vitest'
import { BriefSnapshotSchema, DatasetSchema } from '@/lib/api/schemas'

const baseDelta = { value: 0, delta: 0, deltaKind: 'pp' as const, tone: 'neutral' as const }

const minimalSnapshot = {
  periodEnd: '2026-03-31T00:00:00.000Z',
  priorPeriodEnd: '2025-12-31T00:00:00.000Z',
  vitals: {
    nav: baseDelta, leverage: baseDelta, nonAccrualPct: baseDelta,
    top10ConcentrationPct: baseDelta, pikPct: baseDelta, netFlow: baseDelta,
  },
}

describe('BriefSnapshotSchema', () => {
  it('parses a minimal snapshot', () => {
    expect(() => BriefSnapshotSchema.parse(minimalSnapshot)).not.toThrow()
  })

  it('rejects when a vital tile is missing', () => {
    const { nav: _drop, ...rest } = minimalSnapshot.vitals
    expect(() => BriefSnapshotSchema.parse({ ...minimalSnapshot, vitals: rest })).toThrow()
  })
})

describe('DatasetSchema.briefSnapshot', () => {
  // A representative ds_acred-shaped object without briefSnapshot must still parse,
  // and adding briefSnapshot must also parse.
  const baseDataset = {
    id: 'ds_test', name: 'Test', originatorOrgId: 'org_x', assetClass: 'private-credit',
    schemaId: 'sch_x_v1', schemaVersion: 1, recordCount: 0,
    lastAttestedAt: '2026-01-01T00:00:00.000Z', completenessPct: 1, status: 'active',
    templateCount: 0, lifetimeRunCount: 0,
    attestation: {
      teeMeasurement: '0xaa', codeHash: '0xbb', outputSignature: '0xcc',
    },
    watching: false, alerts: [],
  }

  it('accepts a dataset without briefSnapshot', () => {
    expect(() => DatasetSchema.parse(baseDataset)).not.toThrow()
  })

  it('accepts a dataset with briefSnapshot', () => {
    expect(() => DatasetSchema.parse({ ...baseDataset, briefSnapshot: minimalSnapshot })).not.toThrow()
  })
})
