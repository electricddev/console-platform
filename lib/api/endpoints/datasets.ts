import { mockEndpoint, MockApiError, type RequestContext } from '@/lib/api/client'
import { fixtures } from '@/lib/api/fixtures'
import {
  DatasetSchema, SchemaSchema, RunSchema,
} from '@/lib/api/schemas'
import type { Dataset, Schema, Run, AssetClass } from '@/lib/api/types'

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
