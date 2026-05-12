'use client'
import { useCellQuery } from '@/lib/data/use-cell-query'
import { acredMethodology } from '@/lib/data/acred/methodology'
import { Cell } from '@/lib/data/format-cell'
import type { ColumnDescriptor } from '@/lib/data/types'
import type { MemoInsert } from '@/lib/api/schemas'

/** Build a minimal ColumnDescriptor from a plain column name string. */
function toColumnDescriptor(name: string): ColumnDescriptor {
  return { id: name, label: name, format: 'text' }
}

export function MemoInsertBlock({ insert, footnoteNumber }: { insert: MemoInsert; footnoteNumber: number }) {
  const methodology = acredMethodology.find((m) => m.id === insert.methodologyId)
  const queryResult = useCellQuery(methodology?.dsl ?? null)

  if (!methodology) {
    return (
      <p className="rounded border border-dashed border-border p-3 text-xs text-muted-foreground">
        Methodology &quot;{insert.methodologyId}&quot; not found.
      </p>
    )
  }

  return (
    <figure className="rounded-md border border-border bg-surface/30 p-3 text-xs">
      <figcaption className="mb-2 flex items-baseline gap-2 text-foreground/70">
        <span className="font-mono text-[0.65rem]">[{footnoteNumber}]</span>
        <span className="font-medium">{methodology.title}</span>
        <span className="text-muted-foreground">
          — inserted{' '}
          {new Date(insert.insertedAt).toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
        </span>
      </figcaption>
      {!queryResult.ready && !queryResult.error && (
        <p className="text-muted-foreground">Computing…</p>
      )}
      {queryResult.error && (
        <p className="text-destructive">Error: {queryResult.error.message}</p>
      )}
      {queryResult.ready && queryResult.result && (
        <div className="overflow-auto">
          <table className="w-full text-xs tabular-nums">
            <tbody>
              {queryResult.result.rows.slice(0, 10).map((row, i) => (
                <tr key={i} className="border-t border-border/60">
                  {queryResult.result!.columns.map((col, j) => (
                    <td key={j} className="px-2 py-1">
                      <Cell value={row[col]} column={toColumnDescriptor(col)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  )
}
