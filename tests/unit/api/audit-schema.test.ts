import { describe, it, expect } from 'vitest'
import { AuditEntrySchema } from '@/lib/api/schemas'

describe('AuditEntrySchema', () => {
  it('accepts an entry without anchor', () => {
    expect(() => AuditEntrySchema.parse({
      id: 'au_1', timestamp: new Date().toISOString(),
      actorId: 'usr_x', actorOrgId: 'org_x', signingKey: '0xabc',
      action: 'approved-template', resourceType: 'template', resourceId: 'tpl_x',
      hash: '0xdef',
    })).not.toThrow()
  })
  it('rejects unknown action', () => {
    expect(() => AuditEntrySchema.parse({
      id: 'au_1', timestamp: new Date().toISOString(),
      actorId: 'u', actorOrgId: 'o', signingKey: '0x',
      action: 'unknown-action', resourceType: 'template', resourceId: 't', hash: '0x',
    })).toThrow()
  })
})
