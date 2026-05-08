import Link from 'next/link'
import type { Run } from '@/lib/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KeyValue } from '@/components/common/key-value'
import { fmtDate, fmtDuration, fmtRelativeTime } from '@/lib/format'

type Props = {
  run: Run
  runnerOrgName?: string
}

export function ExecutionContextSection({ run, runnerOrgName }: Props) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-sm font-medium">Execution Context</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KeyValue
            label="Template"
            value={
              <Link href={`/templates/${run.templateId}`} className="hover:underline text-sm">
                {run.templateId}
              </Link>
            }
          />
          <KeyValue
            label="Dataset"
            value={
              <Link href={`/datasets/${run.datasetId}`} className="hover:underline text-sm">
                {run.datasetId}
              </Link>
            }
          />
          <KeyValue
            label="Schema version"
            value={`v${run.schemaVersionAtRun}`}
          />
          <KeyValue
            label="Runner"
            value={runnerOrgName ?? run.runnerOrgId}
          />
          <KeyValue
            label="Queued"
            value={
              <span title={fmtDate(run.queuedAt)}>
                {fmtRelativeTime(run.queuedAt)}
              </span>
            }
          />
          {run.completedAt && (
            <KeyValue
              label="Completed"
              value={
                <span title={fmtDate(run.completedAt)}>
                  {fmtRelativeTime(run.completedAt)}
                </span>
              }
            />
          )}
          {run.durationMs != null && (
            <KeyValue
              label="Duration"
              value={fmtDuration(run.durationMs)}
            />
          )}
          {Object.keys(run.parameters).length > 0 && (
            <div className="sm:col-span-2 lg:col-span-3">
              <KeyValue
                label="Parameters"
                value={
                  <pre className="mt-1 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-xs">
                    {JSON.stringify(run.parameters, null, 2)}
                  </pre>
                }
              />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
