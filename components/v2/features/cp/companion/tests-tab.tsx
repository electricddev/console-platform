'use client'
import { useEffect, useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useCompanionContext } from './companion-context'
import { useAssertions, type AssertionOperator, type Assertion } from './use-assertions'
import { AssertionRow } from './assertion-row'
import {
  parseSelectColumns,
  buildAssertions,
} from '@/components/v2/features/cp/analysis-workbench'

const QUICK_PICKS: AssertionOperator[] = ['not_null', 'unique', 'range', 'regex', 'freshness']

// Derive a sensible operator from a fixture assertion's label string.
// buildAssertions produces labels like: "advance_rate ∈ [0, 1]", "nav_usd not null",
// "as_of within 1 hour of now", "eligible_par not empty".
function labelToOperator(label: string): AssertionOperator {
  if (/within.*hour/i.test(label)) return 'freshness'
  if (/∈\s*\[/i.test(label)) return 'range'
  if (/not null|not empty/i.test(label)) return 'not_null'
  return 'not_null'
}

// Extract the column alias from a fixture assertion id. The id format from
// buildAssertions is `${col.alias}-range`, `${col.alias}-notnull`, etc.
function idToColumn(id: string, columnNames: string[]): string {
  // Try longest-matching column name first to handle aliases with hyphens.
  const sorted = [...columnNames].sort((a, b) => b.length - a.length)
  for (const col of sorted) {
    if (id.startsWith(col + '-')) return col
  }
  // Fallback: strip the last hyphen-separated segment.
  const lastHyphen = id.lastIndexOf('-')
  return lastHyphen > 0 ? id.slice(0, lastHyphen) : id
}

export function TestsTab() {
  const { code, vault } = useCompanionContext()
  const selectColumns = parseSelectColumns(code, vault)
  const columnNames = useMemo(() => selectColumns.map((c) => c.alias), [selectColumns])

  // Seed initial assertions from the existing fixture builder.
  const initial = useMemo((): Assertion[] => {
    const seeded = buildAssertions(selectColumns)
    return seeded.map((a) => ({
      id: a.id,
      column: idToColumn(a.id, columnNames),
      operator: labelToOperator(a.label),
      status: a.status,
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnNames.join(',')])

  const { assertions, add, update, remove, duplicate, runOne, runAll, syncColumns } = useAssertions(initial)

  useEffect(() => {
    syncColumns(columnNames)
  }, [columnNames, syncColumns])

  if (selectColumns.length === 0) {
    return (
      <div className="px-4 py-3">
        <p className="font-mono text-[11px] text-v2-muted">
          Write a SELECT statement to define assertions on output columns.
        </p>
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10.5px] text-v2-muted">
          {assertions.length} assertion{assertions.length !== 1 ? 's' : ''} · all run before the payload is signed
        </span>
        <button
          type="button"
          onClick={runAll}
          disabled={assertions.length === 0}
          className="inline-flex items-center gap-1 rounded border border-v2-border/60 px-2 py-0.5 font-mono text-[10px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground disabled:opacity-40"
        >
          ▶ Run all
        </button>
      </div>

      <ul role="list" className="space-y-1.5">
        {assertions.map((a) => (
          <AssertionRow
            key={a.id}
            assertion={a}
            columns={columnNames}
            onUpdate={update}
            onRemove={remove}
            onDuplicate={duplicate}
            onRunOne={runOne}
          />
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="font-mono text-[10px] text-v2-muted">+ Add</span>
        {QUICK_PICKS.map((op) => (
          <button
            key={op}
            type="button"
            onClick={() => add(columnNames[0] ?? '', op)}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-v2-border/60 px-2 py-0.5 font-mono text-[10px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
          >
            <Plus className="h-2.5 w-2.5" strokeWidth={2} />
            {op}
          </button>
        ))}
      </div>
    </div>
  )
}
