'use client'

import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, ReferenceArea } from 'recharts'

// Deterministic-ish jitter computed once at module load so render stays pure.
const DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  completeness: i === 14 ? 0.87 : 0.97 + Math.random() * 0.02,
}))

export function CompletenessGraph() {
  return (
    <div className="h-48 rounded-lg border border-border bg-surface/40 p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={DATA}>
          <XAxis dataKey="hour" stroke="currentColor" fontSize={11} />
          <YAxis stroke="currentColor" fontSize={11} domain={[0.8, 1.0]} />
          <ReferenceArea x1={13.5} x2={14.5} fill="oklch(0.62 0.21 25)" fillOpacity={0.15} />
          <Line type="monotone" dataKey="completeness" stroke="oklch(0.78 0.07 256)" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
