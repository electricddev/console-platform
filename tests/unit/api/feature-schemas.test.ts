import { describe, it, expect } from 'vitest'
import {
  DatasetSchema, TemplateSchema, RunResultSchema,
} from '@/lib/api/schemas'

describe('feature schemas', () => {
  it('Dataset rejects completenessPct > 1', () => {
    expect(() => DatasetSchema.parse({
      id: 'ds_x', name: 'x', originatorOrgId: 'org_x', assetClass: 'private-credit',
      schemaId: 'sch_x', schemaVersion: 1, recordCount: 1, lastAttestedAt: new Date().toISOString(),
      completenessPct: 1.2, status: 'active', templateCount: 0, lifetimeRunCount: 0,
      attestation: { teeMeasurement: '0xa', codeHash: '0xb', outputSignature: '0xc' },
    })).toThrow()
  })

  it('RunResult discriminates by shape', () => {
    expect(() => RunResultSchema.parse({ shape: 'scalar', value: 0.023 })).not.toThrow()
    expect(() => RunResultSchema.parse({ shape: 'tabular', columns: ['a'], rows: [[1]] })).not.toThrow()
    expect(() => RunResultSchema.parse({ shape: 'pancakes', value: 1 })).toThrow()
  })

  it('Template requires at least one parameter to be ok with empty array', () => {
    const t = TemplateSchema.parse({
      id: 't1', name: 'x', description: 'y',
      authorId: 'u1', authorOrgId: 'o1', versionId: 'v1', versionNumber: 1,
      lastModifiedAt: new Date().toISOString(),
      parameters: [], outputSchema: { shape: 'scalar' }, dsl: 'SELECT 1',
      approvals: [], tags: [], compatibleAssetClasses: [],
    })
    expect(t.id).toBe('t1')
  })
})
