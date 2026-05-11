'use client'

import type { CellResult, RenderShape } from '@/lib/data/methodology'
import { ResultMetric } from './result-metric'
import { ResultComparison } from './result-comparison'
import { ResultTimeSeries } from './result-time-series'
import { ResultBreakdown } from './result-breakdown'
import { ResultTable } from './result-table'

type Props = { result: CellResult; shape: RenderShape }

export function ResultRenderer({ result, shape }: Props) {
  if (result.rows.length === 0) {
    return <p className="text-xs text-muted-foreground">No rows.</p>
  }
  switch (shape) {
    case 'metric':       return <ResultMetric result={result} />
    case 'comparison':   return <ResultComparison result={result} />
    case 'time-series':  return <ResultTimeSeries result={result} />
    case 'breakdown':    return <ResultBreakdown result={result} />
    case 'table':        return <ResultTable result={result} />
  }
}
