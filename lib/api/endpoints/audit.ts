import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { AuditEntrySchema } from '@/lib/api/schemas'
import type { AuditEntry, AuditAction } from '@/lib/api/types'

export type AuditFilters = {
  actorId?: string
  actorOrgId?: string
  resourceType?: AuditEntry['resourceType']
  action?: AuditAction
  resourceId?: string
  search?: string
  fromDate?: string
  toDate?: string
}

function applyFilters(entries: AuditEntry[], f: AuditFilters): AuditEntry[] {
  let out = entries
  if (f.actorId) out = out.filter((e) => e.actorId === f.actorId)
  if (f.actorOrgId) out = out.filter((e) => e.actorOrgId === f.actorOrgId)
  if (f.resourceType) out = out.filter((e) => e.resourceType === f.resourceType)
  if (f.action) out = out.filter((e) => e.action === f.action)
  if (f.resourceId) out = out.filter((e) => e.resourceId === f.resourceId)
  if (f.fromDate) out = out.filter((e) => e.timestamp >= f.fromDate!)
  if (f.toDate) out = out.filter((e) => e.timestamp <= f.toDate!)
  if (f.search) {
    const q = f.search.toLowerCase()
    out = out.filter((e) => e.action.includes(q) || e.resourceId.toLowerCase().includes(q) || e.actorId.toLowerCase().includes(q))
  }
  return out
}

export const listAudit = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: AuditFilters = {}): Promise<AuditEntry[]> => {
    const list = applyFilters(fixtures.audit, filters)
    return list.map((e) => AuditEntrySchema.parse(e))
  },
  { latencyMs: 180 }
)

export const getAuditEntry = mockEndpoint(
  async (_ctx: RequestContext, _signal, id: string): Promise<AuditEntry> => {
    const e = fixtures.audit.find((x) => x.id === id)
    if (!e) throw new MockApiError('Audit entry not found', 404)
    return AuditEntrySchema.parse(e)
  },
  { latencyMs: 100 }
)

export const exportAuditBundle = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: AuditFilters = {}): Promise<string> => {
    const list = applyFilters(fixtures.audit, filters)
    const bundle = {
      generatedAt: new Date().toISOString(),
      entryCount: list.length,
      entries: list,
      signature: '0x' + Math.random().toString(16).slice(2, 18).padEnd(128, '0'),
    }
    return JSON.stringify(bundle, null, 2)
  },
  { latencyMs: 240 }
)
