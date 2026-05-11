'use client'

import type { CellResult } from '@/lib/data/methodology'
import { fmtNumber } from '@/lib/format'

export function ResultMetric({ result }: { result: CellResult }) {
  const row = result.rows[0] ?? {}
  const valueKey = result.columns[0]
  const priorKey = result.columns[1]
  const value = Number(row[valueKey])
  const prior = priorKey ? Number(row[priorKey]) : null
  const delta = prior !== null && Number.isFinite(prior) && Number.isFinite(value) ? value - prior : null
  const deltaTone = delta == null ? '' : delta >= 0 ? 'text-success' : 'text-destructive'

  return (
    <div className="grid gap-1">
      <div className="font-mono text-3xl tabular-nums">{fmtNumber(value, { decimals: 2 })}</div>
      {delta !== null && (
        <div className={`text-xs ${deltaTone}`}>
          {delta >= 0 ? '▲' : '▼'} {fmtNumber(Math.abs(delta), { decimals: 2 })}
        </div>
      )}
    </div>
  )
}
