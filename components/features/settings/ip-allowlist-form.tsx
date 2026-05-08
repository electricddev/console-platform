'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { updateAllowlist } from '@/app/(app)/settings/security/actions'

export function IpAllowlistForm({ initial }: { initial: string[] }) {
  const [list, setList] = useState<string[]>(initial)
  const [next, setNext] = useState('')
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">IP allowlist</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-1">
          {list.length === 0 ? (
            <p className="text-xs text-muted-foreground">No entries — all IPs allowed.</p>
          ) : (
            list.map((cidr) => (
              <Badge key={cidr} variant="outline" className="gap-1 font-mono text-xs">
                {cidr}
                <button
                  type="button"
                  onClick={() => setList(list.filter((x) => x !== cidr))}
                  aria-label={`Remove ${cidr}`}
                >
                  ×
                </button>
              </Badge>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <Input
            value={next}
            onChange={(e) => setNext(e.target.value)}
            placeholder="203.0.113.0/24"
          />
          <Button
            onClick={() => {
              if (next) {
                setList([...list, next])
                setNext('')
              }
            }}
          >
            Add
          </Button>
        </div>
        <Button
          className="justify-self-end"
          onClick={async () => {
            await updateAllowlist(list)
            toast.success('Allowlist saved')
          }}
        >
          Save
        </Button>
      </CardContent>
    </Card>
  )
}
