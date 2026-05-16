'use client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { actionUpdateAlertRule, actionDeleteAlertRule, actionTestAlertRule } from '@/app/(app)/legacy/alerts/actions'
import type { AlertRule } from '@/lib/api/schemas'

export function AlertRuleList({ rules }: { rules: AlertRule[] }) {
  const [pending, startTransition] = useTransition()
  return (
    <ul className="grid gap-2">
      {rules.length === 0 && <p className="text-sm text-muted-foreground">No rules yet.</p>}
      {rules.map((r) => (
        <li key={r.id} className="rounded-md border border-border bg-surface/30 p-3">
          <div className="flex items-baseline justify-between">
            <p className="font-medium">{r.label}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionTestAlertRule(r.id) })}>Test rule</Button>
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionUpdateAlertRule(r.id, { enabled: !r.enabled }) })}>
                {r.enabled ? 'Disable' : 'Enable'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => startTransition(() => { actionDeleteAlertRule(r.id) })}>Delete</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {r.condition.metric} {r.condition.direction} {r.condition.threshold} ·
            {' '}{r.scope.datasetIds.length === 0 ? 'all assets' : `${r.scope.datasetIds.length} asset(s)`} ·
            {' '}{r.channelIds.length} channel(s) ·
            {' '}{r.enabled ? 'enabled' : 'disabled'}
          </p>
        </li>
      ))}
      {pending && <p className="sr-only">Updating…</p>}
    </ul>
  )
}
