'use client'
import { useState } from 'react'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCompanionContext } from './companion-context'
import { ColumnStatsPopover, type ColumnStats } from './column-stats-popover'
import { SAMPLE_ROWS, isNumericValue } from './companion-panel'
import {
  parseSelectColumns,
  hasFromClause,
  extractLineageRefs,
} from '@/components/v2/features/cp/analysis-workbench'

const LIMIT_OPTIONS = [5, 100, 1000] as const
type Limit = (typeof LIMIT_OPTIONS)[number]

export function DryRunTab() {
  const { code, vault } = useCompanionContext()
  const [limit, setLimit] = useState<Limit>(5)
  const [runToken, setRunToken] = useState(0)

  const selectColumns = parseSelectColumns(code, vault)
  const hasFrom = hasFromClause(code)
  const canShow = hasFrom && code.trim().length > 0

  if (!canShow) {
    return (
      <div className="px-4 py-3">
        <p className="font-mono text-[11px] text-v2-muted">
          Write a SELECT statement to preview output.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[9.5px] text-v2-muted">
          Snapshot 2026-05-15 14:22 UTC · {SAMPLE_ROWS.length.toLocaleString()} rows · 340ms
        </span>
        <div className="flex items-center gap-2">
          <label className="font-mono text-[10.5px] text-v2-muted">
            Limit{' '}
            <select
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value, 10) as Limit)}
              className="rounded border border-v2-border/60 bg-transparent px-1.5 py-0.5 font-mono text-[10.5px] text-v2-foreground"
            >
              {LIMIT_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setRunToken((t) => t + 1)}
            className="inline-flex items-center gap-1 rounded border border-v2-border/60 px-2 py-0.5 font-mono text-[10px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
          >
            <Play className="h-2.5 w-2.5" strokeWidth={2} />
            Re-run
          </button>
        </div>
      </div>

      {selectColumns.length === 0 ? (
        <p className="font-mono text-[11px] text-v2-muted">
          Add AS aliases to your SELECT columns for schema preview.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-v2-border/60">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-v2-border/60 bg-v2-foreground/[0.04]">
                {selectColumns.map((col) => {
                  const lineage = extractLineageRefs(col.expression, vault)
                  const lineageChip = lineage[0]?.label ?? null
                  const stats = mockStatsFor(col.alias, col.type ?? 'computed')
                  return (
                    <th key={col.alias} className="px-3 py-1.5 align-bottom">
                      <ColumnStatsPopover
                        columnName={col.alias}
                        type={col.type ?? 'computed'}
                        stats={stats}
                      >
                        <button
                          type="button"
                          className="block w-full text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-v2-foreground/40"
                        >
                          <span className="block font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-v2-muted">
                            {col.alias}{' '}
                            <span className="ml-1 normal-case tracking-normal text-v2-muted/70">
                              {col.type ?? 'computed'}
                            </span>
                          </span>
                          {lineageChip && (
                            <span className="mt-0.5 block">
                              <span className="rounded bg-v2-foreground/[0.05] px-1 py-px font-mono text-[9px] text-v2-muted">
                                ←{lineageChip}
                              </span>
                            </span>
                          )}
                        </button>
                      </ColumnStatsPopover>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {SAMPLE_ROWS.slice(0, limit).map((row, i) => (
                <tr
                  key={`${runToken}-${i}`}
                  className="border-b border-v2-border/60 last:border-0"
                >
                  {selectColumns.map((col) => {
                    const val =
                      row[col.alias] ??
                      (col.type === 'TIMESTAMP'
                        ? '2026-05-15T14:22:18Z'
                        : col.type === 'TEXT'
                          ? 'fresh'
                          : col.type === 'NUMERIC'
                            ? '—'
                            : '—')
                    const isNum = isNumericValue(String(val))
                    return (
                      <td
                        key={col.alias}
                        className={cn(
                          'px-3 py-1.5 font-mono text-[11px] text-v2-foreground',
                          isNum && 'text-right tabular-nums',
                        )}
                      >
                        {val}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="font-mono text-[9.5px] text-v2-muted">
        Sample rows · executed against snapshot 2026-05-15 14:22 UTC · ~340ms · 127,432 rows scanned
      </p>
    </div>
  )
}

function mockStatsFor(name: string, type: string): ColumnStats {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const sparkline = Array.from({ length: 12 }, (_, i) => Math.sin((i + hash) * 0.5) * 10 + 20)
  return {
    min: type === 'NUMERIC' ? '0.84' : type === 'TIMESTAMP' ? '2026-05-01' : 'A',
    max: type === 'NUMERIC' ? '1.02' : type === 'TIMESTAMP' ? '2026-05-15' : 'Z',
    nulls: 0,
    total: 127432,
    topValues:
      type === 'TEXT'
        ? [
            { value: 'private_credit', count: 89412 },
            { value: 'venture_debt', count: 24210 },
            { value: 'other', count: 13810 },
          ]
        : [],
    sparkline,
  }
}
