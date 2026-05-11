'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Props = { top: { value: string; count: number }[] }

export function ProfileChartCategorical({ top }: Props) {
  return (
    <div className="h-40 w-full">
      <ResponsiveContainer>
        <BarChart data={top} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="value" tick={{ fontSize: 10 }} width={80} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
