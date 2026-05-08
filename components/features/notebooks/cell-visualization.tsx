'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { fixtures } from '@/lib/api/fixtures'

export function CellVisualization({ runId, shape }: { runId: string; shape: 'bar' | 'line' | 'distribution' }) {
  const run = fixtures.runs.find((r) => r.id === runId)
  if (!run?.result) return null
  if (run.result.shape === 'time-series' && shape === 'line') {
    const data = run.result.series[0].points.map((p) => ({ t: p.t.slice(11, 16), v: p.v }))
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium">{run.result.metric}</CardTitle></CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <XAxis dataKey="t" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Line type="monotone" dataKey="v" stroke="oklch(0.78 0.07 256)" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }
  if (run.result.shape === 'tabular' && shape === 'bar') {
    const data = run.result.rows.map((row) => ({ name: String(row[0]), value: Number(row[1]) }))
    return (
      <Card>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="name" stroke="currentColor" fontSize={11} />
                <YAxis stroke="currentColor" fontSize={11} />
                <Bar dataKey="value" fill="oklch(0.78 0.07 256)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    )
  }
  return <p className="text-xs text-muted-foreground">No visualization available for this run shape.</p>
}
