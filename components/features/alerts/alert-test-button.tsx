'use client'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { actionSendTestEvent } from '@/app/(app)/legacy/alerts/actions'

export function AlertTestButton({ channelId }: { channelId: string }) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<'idle' | 'ok' | 'fail'>('idle')

  function send() {
    startTransition(async () => {
      const r = await actionSendTestEvent(channelId)
      setResult(r.delivered ? 'ok' : 'fail')
      setTimeout(() => setResult('idle'), 3_000)
    })
  }

  return (
    <Button size="sm" variant="ghost" onClick={send} disabled={pending}>
      {result === 'ok' ? 'Sent ✓' : result === 'fail' ? 'Failed' : 'Send test event'}
    </Button>
  )
}
