'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CopyableHash } from '@/components/common/copyable-hash'
import { useRouter } from 'next/navigation'
import { createApiKeyAction } from '@/app/(app)/settings/integrations/actions'
import type { ApiKeyScopeSchema } from '@/lib/api/schemas'
import type { z } from 'zod'

type Scope = z.infer<typeof ApiKeyScopeSchema>

export function CreateApiKeyDialog() {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [scopes, setScopes] = useState<Scope[]>(['read'])
  const [secret, setSecret] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const router = useRouter()

  function toggle(s: Scope) {
    setScopes((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s])
  }

  function create() {
    start(async () => {
      const r = await createApiKeyAction({ label, scopes })
      setSecret(r.secret)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setSecret(null); router.refresh() } }}>
      <DialogTrigger asChild><Button>Create API key</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API key</DialogTitle>
          <DialogDescription>Secrets are shown once. Copy and store immediately.</DialogDescription>
        </DialogHeader>
        {secret ? (
          <div className="grid gap-3">
            <p className="text-sm">Your secret (will not be shown again):</p>
            <CopyableHash value={secret} short={false} />
            <Button onClick={() => setOpen(false)}>Done</Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label htmlFor="ak-label">Label</Label><Input id="ak-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="CI runner" /></div>
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Scopes</legend>
              {(['read', 'execute', 'admin'] as const).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={scopes.includes(s)} onCheckedChange={() => toggle(s)} />
                  {s}
                </label>
              ))}
            </fieldset>
            <Button onClick={create} disabled={pending || label.trim().length === 0 || scopes.length === 0}>
              {pending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
