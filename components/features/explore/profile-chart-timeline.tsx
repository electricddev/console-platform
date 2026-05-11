'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Props = { buckets: { monthISO: string; count: number }[] }

export function ProfileChartTimeline({ buckets }: Props) {
  return (
    <div className="h-32 w-full">
      <ResponsiveContainer>
        <BarChart data={buckets} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <XAxis dataKey="monthISO" tickFormatter={(d: string) => d.slice(0, 7)} tick={{ fontSize: 10 }} />
          <YAxis hide />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Bar dataKey="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
