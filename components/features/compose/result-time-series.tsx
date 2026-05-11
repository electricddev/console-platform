'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { CellResult } from '@/lib/data/methodology'

export function ResultTimeSeries({ result }: { result: CellResult }) {
  const periodKey = result.columns[0]
  const valueKey = result.columns[1]
  const data = result.rows.map((r) => ({
    period: String(r[periodKey]),
    value: Number(r[valueKey]),
  }))
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
          <XAxis dataKey="period" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(0, 7)} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="value" stroke="oklch(0.40 0.10 160)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
