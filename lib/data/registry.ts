import type { TableDescriptor } from './types'
import { acredTables } from './acred/tables'

const REGISTRY: Record<string, TableDescriptor[]> = {
  ds_acred: acredTables,
}

export function getTablesForDataset(datasetId: string): TableDescriptor[] | null {
  return REGISTRY[datasetId] ?? null
}
