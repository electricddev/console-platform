import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import type { Schema } from '@/lib/api/types'

type Finding = {
  severity: 'critical' | 'warn'
  message: string
}

export function PrivacyAdvisorPanel({ schema }: { schema: Schema }) {
  const findings: Finding[] = []

  for (const f of schema.fields) {
    if (f.exposure !== 'private' && f.isPii) {
      findings.push({
        severity: 'critical',
        message: `Field "${f.name}" is flagged PII but exposure is ${f.exposure}.`,
      })
    }
    if (
      f.exposure === 'aggregated-only' &&
      (!f.minBucketSize || f.minBucketSize < schema.policy.kAnonymity)
    ) {
      findings.push({
        severity: 'warn',
        message: `Field "${f.name}" min-bucket-size below k-anonymity (${schema.policy.kAnonymity}).`,
      })
    }
  }

  const ok = findings.length === 0

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        {ok ? (
          <ShieldCheck className="size-4 text-success" aria-hidden />
        ) : (
          <ShieldAlert className="size-4 text-warning" aria-hidden />
        )}
        <CardTitle className="text-sm font-medium">AI privacy advisor</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        {ok ? (
          <p className="text-muted-foreground">
            No leakage paths detected at current k-anonymity ({schema.policy.kAnonymity}).
          </p>
        ) : (
          findings.map((f, i) => (
            <p
              key={i}
              className={f.severity === 'critical' ? 'text-destructive' : 'text-warning'}
            >
              &bull; {f.message}
            </p>
          ))
        )}
      </CardContent>
    </Card>
  )
}
