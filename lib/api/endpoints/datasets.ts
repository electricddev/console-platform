import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import {
  DatasetSchema, SchemaSchema, RunSchema,
  RedFlagSchema, AnomalyEventSchema, PeerDispersionRowSchema,
  AttestationDisciplineSchema, AmmFeedSchema,
} from '@/lib/api/schemas'
import type { Dataset, Schema, Run, AssetClass } from '@/lib/api/types'
import type {
  RedFlag, AnomalyEvent, PeerDispersionRow, AttestationDiscipline, AmmFeed,
} from '@/lib/api/schemas'
import { z } from 'zod'
import { acredFacts } from '@/lib/data/acred/facts'
import { evaluateAcredRedFlags } from '@/lib/data/acred/red-flags'
import { acredAnomalyFeed } from '@/lib/data/acred/anomalies'
import { acredPeerDispersion } from '@/lib/data/acred/peers'
import { acredAttestationDiscipline } from '@/lib/data/acred/attestation-discipline'
import { acredAmmFeed } from '@/lib/data/acred/amm'

export type DatasetFilters = {
  search?: string
  assetClass?: AssetClass
  status?: 'active' | 'paused' | 'archived'
  originatorOrgId?: string
}

export const listDatasets = mockEndpoint(
  async (_ctx: RequestContext, _signal, filters: DatasetFilters = {}): Promise<Dataset[]> => {
    let list = fixtures.datasets.slice()
    if (filters.assetClass) list = list.filter((d) => d.assetClass === filters.assetClass)
    if (filters.status) list = list.filter((d) => d.status === filters.status)
    if (filters.originatorOrgId) list = list.filter((d) => d.originatorOrgId === filters.originatorOrgId)
    if (filters.search) {
      const q = filters.search.toLowerCase()
      list = list.filter((d) => d.name.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q))
    }
    return list.map((d) => DatasetSchema.parse(d))
  },
  { latencyMs: 180 }
)

export const getDataset = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Dataset> => {
    const found = fixtures.datasets.find((d) => d.id === datasetId)
    if (!found) throw new MockApiError(`Dataset ${datasetId} not found`, 404)
    return DatasetSchema.parse(found)
  },
  { latencyMs: 120 }
)

export const getDatasetSchema = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Schema> => {
    const ds = fixtures.datasets.find((d) => d.id === datasetId)
    if (!ds) throw new MockApiError(`Dataset ${datasetId} not found`, 404)
    const s = fixtures.schemas.find((x) => x.id === ds.schemaId)
    if (!s) throw new MockApiError(`Schema ${ds.schemaId} not found`, 404)
    return SchemaSchema.parse(s)
  },
  { latencyMs: 120 }
)

export const getDatasetRuns = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Run[]> => {
    return fixtures.runs.filter((r) => r.datasetId === datasetId).map((r) => RunSchema.parse(r))
  },
  { latencyMs: 160 }
)

export type LineageNode = {
  id: string
  label: string
  kind: 'source' | 'agent' | 'storage' | 'enclave' | 'output'
  status: 'ok' | 'lagging' | 'down'
}
export type LineageEdge = { from: string; to: string }
export type Lineage = { nodes: LineageNode[]; edges: LineageEdge[] }

export const getDatasetLineage = mockEndpoint(
  async (_ctx: RequestContext, _signal, datasetId: string): Promise<Lineage> => {
    // Lineage is identical for every dataset at this mock tier.
    void datasetId
    return {
      nodes: [
        { id: 'src', label: 'Postgres @ originator', kind: 'source', status: 'ok' },
        { id: 'agent', label: 'Hyve Connect agent', kind: 'agent', status: 'ok' },
        { id: 'store', label: 'H3 storage', kind: 'storage', status: 'ok' },
        { id: 'tee', label: 'TEE enclave', kind: 'enclave', status: 'ok' },
        { id: 'out', label: 'Signed output', kind: 'output', status: 'ok' },
      ],
      edges: [
        { from: 'src', to: 'agent' },
        { from: 'agent', to: 'store' },
        { from: 'store', to: 'tee' },
        { from: 'tee', to: 'out' },
      ],
    }
  },
  { latencyMs: 200 }
)

export const getAcredBriefRedFlags = mockEndpoint(
  async (_ctx: RequestContext, _signal): Promise<RedFlag[]> => {
    void _ctx; void _signal
    return z.array(RedFlagSchema).parse(evaluateAcredRedFlags(acredFacts.snapshot, acredFacts))
  },
  { latencyMs: 100 }
)

export const getAcredAnomalyFeed = mockEndpoint(
  async (_ctx: RequestContext, _signal): Promise<AnomalyEvent[]> => {
    void _ctx; void _signal
    return z.array(AnomalyEventSchema).parse(acredAnomalyFeed)
  },
  { latencyMs: 100 }
)

export const getAcredPeerDispersion = mockEndpoint(
  async (_ctx: RequestContext, _signal): Promise<PeerDispersionRow[]> => {
    void _ctx; void _signal
    return z.array(PeerDispersionRowSchema).parse(acredPeerDispersion)
  },
  { latencyMs: 140 }
)

export const getAcredAttestationDiscipline = mockEndpoint(
  async (_ctx: RequestContext, _signal): Promise<AttestationDiscipline> => {
    void _ctx; void _signal
    return AttestationDisciplineSchema.parse(acredAttestationDiscipline)
  },
  { latencyMs: 120 }
)

export const getAcredAmmFeed = mockEndpoint(
  async (_ctx: RequestContext, _signal): Promise<AmmFeed> => {
    void _ctx; void _signal
    const refreshed: AmmFeed = {
      ...acredAmmFeed,
      anomalyStream: acredAmmFeed.anomalyStream.map((e, i) =>
        i === 0
          ? { ...e, occurredAt: new Date(Date.now() - 2 * 60_000).toISOString() }
          : e,
      ),
    }
    return AmmFeedSchema.parse(refreshed)
  },
  { latencyMs: 100 }
)
