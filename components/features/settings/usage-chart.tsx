'use client'

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'

const data = Array.from({ length: 6 }, (_, i) => ({
  month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i],
  runs: 800 + Math.floor(Math.random() * 600),
  attestations: 800 + Math.floor(Math.random() * 600),
  anchors: 700 + Math.floor(Math.random() * 500),
}))

export function UsageChart() {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="month" stroke="currentColor" fontSize={12} />
          <YAxis stroke="currentColor" fontSize={12} />
          <Bar dataKey="runs" fill="oklch(0.78 0.07 256)" />
          <Bar dataKey="attestations" fill="oklch(0.65 0.05 256)" />
          <Bar dataKey="anchors" fill="oklch(0.50 0.04 256)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
