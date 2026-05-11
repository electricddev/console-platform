'use client'

import type { CellResult } from '@/lib/data/methodology'

export function ResultTable({ result }: { result: CellResult }) {
  return (
    <div className="overflow-auto rounded-md border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-surface/80 text-muted-foreground">
          <tr>
            {result.columns.map((c) => (
              <th key={c} className="px-2 py-1 text-left font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr key={i} className="border-t border-border/40">
              {result.columns.map((c) => (
                <td key={c} className="px-2 py-1 font-mono text-xs tabular-nums">
                  {row[c] === null || row[c] === undefined ? '—' : String(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
