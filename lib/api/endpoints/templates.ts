import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { TemplateSchema } from '@/lib/api/schemas'
import type { Template, TemplateParameter, OutputSchema } from '@/lib/api/types'

const state: Template[] = fixtures.templates.map((t) => ({ ...t }))

export type TemplateFilters = {
  search?: string
  datasetId?: string
  ownership?: 'mine' | 'org' | 'shared'
  approvalState?: 'unsubmitted' | 'pending' | 'approved' | 'denied' | 'changes-requested'
}

export const listTemplates = mockEndpoint(
  async (ctx: RequestContext, _signal, filters: TemplateFilters = {}): Promise<Template[]> => {
    let list = state.slice()
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }
    if (filters.datasetId) list = list.filter((t) => t.approvals.some((a) => a.datasetId === filters.datasetId))
    if (filters.ownership === 'mine' && ctx.user) list = list.filter((t) => t.authorId === ctx.user!.id)
    if (filters.ownership === 'org' && ctx.user) list = list.filter((t) => t.authorOrgId === ctx.user!.orgId)
    if (filters.approvalState) list = list.filter((t) => t.approvals.some((a) => a.state === filters.approvalState))
    return list.map((t) => TemplateSchema.parse(t))
  },
  { latencyMs: 160 }
)

export const getTemplate = mockEndpoint(
  async (_ctx: RequestContext, _signal, templateId: string): Promise<Template> => {
    const t = state.find((x) => x.id === templateId)
    if (!t) throw new MockApiError(`Template ${templateId} not found`, 404)
    return TemplateSchema.parse(t)
  },
  { latencyMs: 100 }
)

export type DraftInput = {
  name: string
  description: string
  dsl: string
  parameters: TemplateParameter[]
  outputSchema: OutputSchema
  tags?: string[]
}

export const draftTemplate = mockEndpoint(
  async (ctx: RequestContext, _signal, input: DraftInput): Promise<Template> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const id = 'tpl_' + Math.random().toString(36).slice(2, 10)
    const t: Template = {
      id,
      name: input.name,
      description: input.description,
      authorId: ctx.user.id,
      authorOrgId: ctx.user.orgId,
      versionId: id + '_v1',
      versionNumber: 1,
      lastModifiedAt: new Date().toISOString(),
      parameters: input.parameters,
      outputSchema: input.outputSchema,
      dsl: input.dsl,
      approvals: [],
      tags: input.tags ?? [],
      compatibleAssetClasses: [],
      archived: false,
    }
    state.unshift(t)
    return TemplateSchema.parse(t)
  },
  { latencyMs: 220 }
)

export const archiveTemplate = mockEndpoint(
  async (_ctx: RequestContext, _signal, templateId: string) => {
    const t = state.find((x) => x.id === templateId)
    if (!t) throw new MockApiError('Template not found', 404)
    t.archived = true
    return { ok: true as const }
  },
  { latencyMs: 80 }
)

export const forkTemplate = mockEndpoint(
  async (ctx: RequestContext, _signal, templateId: string): Promise<Template> => {
    if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
    const src = state.find((x) => x.id === templateId)
    if (!src) throw new MockApiError('Source template not found', 404)
    const id = 'tpl_' + Math.random().toString(36).slice(2, 10)
    const fork: Template = {
      ...src,
      id,
      versionId: id + '_v1',
      versionNumber: 1,
      lastModifiedAt: new Date().toISOString(),
      authorId: ctx.user.id,
      authorOrgId: ctx.user.orgId,
      approvals: [],
      forkOfTemplateId: src.id,
      name: src.name + ' (fork)',
    }
    state.unshift(fork)
    return TemplateSchema.parse(fork)
  },
  { latencyMs: 220 }
)

export const submitForApproval = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { templateId: string; datasetId: string }) => {
    const t = state.find((x) => x.id === input.templateId)
    if (!t) throw new MockApiError('Template not found', 404)
    const existing = t.approvals.find((a) => a.datasetId === input.datasetId)
    if (existing) existing.state = 'pending'
    else t.approvals.push({ datasetId: input.datasetId, state: 'pending' })
    return { ok: true as const }
  },
  { latencyMs: 200 }
)
