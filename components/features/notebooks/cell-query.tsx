import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fixtures } from '@/lib/api/fixtures'

export function CellQuery({ dsl, runId }: { dsl: string; runId?: string }) {
  const run = runId ? fixtures.runs.find((r) => r.id === runId) : null
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium">Query</CardTitle></CardHeader>
      <CardContent className="grid gap-2">
        <pre className="overflow-auto rounded-md border border-border/60 bg-background p-2 font-mono text-xs">{dsl}</pre>
        {run && (
          <p className="text-xs text-muted-foreground">
            Result from <Link href={`/runs/${run.id}`} className="hover:underline font-mono">{run.id}</Link>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
