export type Format =
  | 'currency'
  | 'percent'
  | 'bps'
  | 'integer'
  | 'decimal'
  | 'date'
  | 'datetime'
  | 'identifier'
  | 'enum'
  | 'text'
  | 'boolean'

export type EnumTone = 'success' | 'warning' | 'danger' | 'neutral'

export type ColumnDescriptor = {
  id: string
  label: string
  description?: string
  format: Format
  unit?: string
  precision?: number
  enumValues?: Record<string, { tone: EnumTone; label?: string }>
  hidden?: boolean
}

export type TableDescriptor = {
  id: string
  label: string
  description: string
  primaryKey: string
  defaultSort?: { column: string; dir: 'asc' | 'desc' }
  columns: ColumnDescriptor[]
}

/** Resolved column = descriptor merged with the DuckDB-reported type. */
export type ResolvedColumn = ColumnDescriptor & {
  duckdbType: string
  curated: boolean
}

export type SortState = { column: string; dir: 'asc' | 'desc' } | null

export type NumericFilter = {
  kind: 'numeric'
  column: string
  min?: number
  max?: number
}

export type EnumFilter = {
  kind: 'enum'
  column: string
  values: string[]
}

export type DateFilter = {
  kind: 'date'
  column: string
  fromISO?: string
  toISO?: string
}

export type TextFilter = {
  kind: 'text'
  column: string
  contains: string
}

export type BooleanFilter = {
  kind: 'boolean'
  column: string
  value: boolean | null
}

export type ColumnFilter =
  | NumericFilter
  | EnumFilter
  | DateFilter
  | TextFilter
  | BooleanFilter

export type FilterState = {
  table: string
  filters: ColumnFilter[]
  sort: SortState
}
