'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Props = { bins: { x0: number; x1: number; count: number }[]; formatTick: (v: number) => string }

export function ProfileChartHistogram({ bins, formatTick }: Props) {
  const data = bins.map((b) => ({ mid: (b.x0 + b.x1) / 2, count: b.count, x0: b.x0, x1: b.x1 }))
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="mid" tickFormatter={formatTick} tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip
            formatter={(v: number) => [v, 'count']}
            labelFormatter={(v: number) => formatTick(v)}
            contentStyle={{ fontSize: 12 }}
          />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
