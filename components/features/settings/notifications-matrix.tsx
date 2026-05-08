'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const KINDS = [
  'attestation-published',
  'approval-requested',
  'approval-decided',
  'completeness-alert',
  'schema-changed',
  'access-granted',
  'access-revoked',
  'run-completed',
  'run-failed',
  'anomaly-detected',
] as const

const CHANNELS = ['email', 'in-app', 'webhook'] as const

type Kind = (typeof KINDS)[number]
type Channel = (typeof CHANNELS)[number]
type State = Record<Kind, Record<Channel, boolean>>

const initial: State = Object.fromEntries(
  KINDS.map((k) => [k, { email: true, 'in-app': true, webhook: false }]),
) as State

export function NotificationsMatrix() {
  const [state, setState] = useState<State>(initial)

  function toggle(kind: Kind, channel: Channel) {
    setState((s) => ({ ...s, [kind]: { ...s[kind], [channel]: !s[kind][channel] } }))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Notification preferences</CardTitle>
        <Button onClick={() => toast.success('Preferences saved')}>Save</Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface/60 text-left font-tag text-foreground/55">
              <tr>
                <th className="px-3 py-2">Event</th>
                {CHANNELS.map((c) => (
                  <th key={c} className="px-3 py-2 text-center">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KINDS.map((k) => (
                <tr key={k} className="border-t border-border/60">
                  <td className="px-3 py-2 font-mono text-xs">{k}</td>
                  {CHANNELS.map((c) => (
                    <td key={c} className="px-3 py-2 text-center">
                      <Checkbox checked={state[k][c]} onCheckedChange={() => toggle(k, c)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
