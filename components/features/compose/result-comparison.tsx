'use client'

import type { CellResult } from '@/lib/data/methodology'
import { fmtNumber } from '@/lib/format'

export function ResultComparison({ result }: { result: CellResult }) {
  const labelKey = result.columns[0]
  const valueKey = result.columns[1]
  if (result.rows.length < 2 || !labelKey || !valueKey) {
    return <p className="text-xs text-muted-foreground">Comparison expects ≥2 rows with (label, value).</p>
  }
  const primary = result.rows[0]
  const comparand = result.rows[1]
  const pv = Number(primary[valueKey])
  const cv = Number(comparand[valueKey])
  const delta = Number.isFinite(pv) && Number.isFinite(cv) ? pv - cv : null
  const max = Math.max(Math.abs(pv), Math.abs(cv), 1)

  return (
    <div className="grid gap-2">
      {delta !== null && (
        <div className={`text-xs ${delta >= 0 ? 'text-success' : 'text-destructive'}`}>
          {delta >= 0 ? '▲' : '▼'} {fmtNumber(Math.abs(delta), { decimals: 2 })}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        {[primary, comparand].map((row, i) => {
          const v = Number(row[valueKey])
          const w = Math.max(2, Math.round((Math.abs(v) / max) * 100))
          return (
            <div key={i} className="grid gap-1">
              <div className="text-xs text-muted-foreground">{String(row[labelKey])}</div>
              <div className="font-mono text-lg tabular-nums">{fmtNumber(v, { decimals: 2 })}</div>
              <div className="h-1 rounded bg-accent">
                <div className="h-1 rounded bg-foreground/70" style={{ width: `${w}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
