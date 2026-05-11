'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { CellResult } from '@/lib/data/methodology'

export function ResultBreakdown({ result }: { result: CellResult }) {
  const labelKey = result.columns[0]
  const valueKey = result.columns[1]
  const data = result.rows.slice(0, 10).map((r) => ({
    label: String(r[labelKey]),
    value: Number(r[valueKey]),
  }))
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={100} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="value" fill="oklch(0.40 0.10 160)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
