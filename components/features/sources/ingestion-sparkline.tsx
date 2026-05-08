'use client'

import { LineChart, Line, ResponsiveContainer } from 'recharts'

export function IngestionSparkline({ values }: { values: number[] }) {
  const data = values.map((v, i) => ({ i, v }))
  return (
    <div className="h-7 w-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
          <Line type="monotone" dataKey="v" stroke="currentColor" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
