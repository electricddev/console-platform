import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import { RunSchema } from '@/lib/api/schemas'
import type { Run, RunStatus } from '@/lib/api/types'
import { publish, Topics } from '@/lib/api/realtime'

const state: Run[] = fixtures.runs.map((r) => ({ ...r }))

export type RunFilters = {
  templateId?: string
  datasetId?: string
  runnerOrgId?: string
  status?: RunStatus
  search?: string
}

export const listRuns = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: RunFilters = {}): Promise<Run[]> => {
    let list = state.slice().sort((a, b) => b.queuedAt.localeCompare(a.queuedAt))
    if (filters.templateId) list = list.filter((r) => r.templateId === filters.templateId)
    if (filters.datasetId) list = list.filter((r) => r.datasetId === filters.datasetId)
    if (filters.runnerOrgId) list = list.filter((r) => r.runnerOrgId === filters.runnerOrgId)
    if (filters.status) list = list.filter((r) => r.status === filters.status)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter((r) => r.id.toLowerCase().includes(q) || r.templateId.toLowerCase().includes(q))
    }
    return list.map((r) => RunSchema.parse(r))
  },
  { latencyMs: 180 }
)

export const getRun = mockEndpoint(
  async (_ctx: RequestContext, _signal, runId: string): Promise<Run> => {
    const r = state.find((x) => x.id === runId)
    if (!r) throw new MockApiError(`Run ${runId} not found`, 404)
    return RunSchema.parse(r)
  },
  { latencyMs: 120 }
)

export type ExecuteInput = {
  templateId: string
  datasetId: string
  parameters: Record<string, unknown>
}

const att = (seed: string) => ({
  teeMeasurement: `0x${seed.padEnd(64, '7')}`,
  codeHash: `0x${seed.padEnd(64, '8')}`,
  outputSignature: `0x${seed.padEnd(64, '9')}`,
  anchorTxHash: `0x${seed.padEnd(64, 'a')}`,
  anchorBlockNumber: 19_900_000 + seed.length * 19,
  anchorChain: 'base' as const,
  anchoredAt: new Date().toISOString(),
})

async function executeTemplateInner(ctx: RequestContext, input: ExecuteInput): Promise<Run> {
  if (!ctx.user) throw new MockApiError('Unauthenticated', 401)
  const id = 'run_' + Math.random().toString(36).slice(2, 8)
  const now = new Date().toISOString()
  const run: Run = {
    id,
    templateId: input.templateId,
    templateVersionId: input.templateId + '_v_latest',
    datasetId: input.datasetId,
    schemaVersionAtRun: 3,
    runnerId: ctx.user.id,
    runnerOrgId: ctx.user.orgId,
    parameters: input.parameters,
    status: 'queued',
    queuedAt: now,
  }
  state.unshift(run)
  publish(Topics.RUNS_PROGRESS, run)

  // Simulate progression: queued → running → attesting → anchoring → completed.
  const progression: RunStatus[] = ['running', 'attesting', 'anchoring', 'completed']
  progression.forEach((s, i) =>
    setTimeout(() => {
      const r = state.find((x) => x.id === id)
      if (!r || r.status === 'completed' || r.status === 'failed') return
      r.status = s
      if (s === 'running') r.startedAt = new Date().toISOString()
      if (s === 'completed') {
        r.completedAt = new Date().toISOString()
        r.durationMs = (i + 1) * 600
        r.result = { shape: 'scalar', value: 0.823, unit: 'rate' }
        r.attestation = att(id)
      }
      publish(Topics.RUNS_PROGRESS, { ...r })
    }, (i + 1) * 600)
  )

  return RunSchema.parse(run)
}

export const executeTemplate = mockEndpoint(
  async (ctx: RequestContext, _signal, input: ExecuteInput) => executeTemplateInner(ctx, input),
  { latencyMs: 220 }
)

export const retryRun = mockEndpoint(
  async (ctx: RequestContext, _signal, runId: string): Promise<Run> => {
    const src = state.find((x) => x.id === runId)
    if (!src) throw new MockApiError('Run not found', 404)
    return executeTemplateInner(ctx, {
      templateId: src.templateId,
      datasetId: src.datasetId,
      parameters: src.parameters as Record<string, unknown>,
    })
  },
  { latencyMs: 80 }
)

export const disputeRun = mockEndpoint(
  async (_ctx: RequestContext, _signal, input: { runId: string; reason: string }) => {
    const r = state.find((x) => x.id === input.runId)
    if (!r) throw new MockApiError('Run not found', 404)
    r.status = 'disputed'
    r.disputeReason = input.reason
    return { ok: true as const }
  },
  { latencyMs: 200 }
)
