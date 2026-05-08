'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const RESOURCE_TYPES = ['all', 'dataset', 'template', 'run', 'schema', 'source', 'approval', 'access-grant'] as const

export function AuditFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  function update(key: string, value: string) {
    const next = new URLSearchParams(sp.toString())
    if (!value || value === 'all') next.delete(key)
    else next.set(key, value)
    router.replace(`${pathname}?${next.toString()}`)
  }
  return (
    <div className="grid gap-4 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="audit-q">Search</Label>
        <Input id="audit-q" defaultValue={sp.get('q') ?? ''} placeholder="action, resource id, actor" onChange={(e) => update('q', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label>Resource type</Label>
        <Select defaultValue={sp.get('type') ?? 'all'} onValueChange={(v) => update('type', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-actor">Actor</Label>
        <Input id="audit-actor" defaultValue={sp.get('actor') ?? ''} placeholder="usr_maya" onChange={(e) => update('actor', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-from">From date</Label>
        <Input id="audit-from" type="date" defaultValue={sp.get('from') ?? ''} onChange={(e) => update('from', e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="audit-to">To date</Label>
        <Input id="audit-to" type="date" defaultValue={sp.get('to') ?? ''} onChange={(e) => update('to', e.target.value)} />
      </div>
    </div>
  )
}
