export type RenderShape =
  | 'metric'
  | 'comparison'
  | 'time-series'
  | 'breakdown'
  | 'table'

export type Axis = 'time' | 'segment' | 'snapshot'

export type Methodology = {
  id: string
  title: string
  description: string
  axis: Axis
  shape: RenderShape
  dsl: string
}

/** A single cell's executed result. Stored ephemerally in the composer; never persisted. */
export type CellResult = {
  columns: string[]
  rows: Record<string, unknown>[]
  runtimeMs: number
}
