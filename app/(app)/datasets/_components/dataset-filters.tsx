'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'

const ASSET_CLASSES = ['all', 'private-credit', 'trade-receivables', 'flow-credit', 't-bills', 'multi-asset'] as const
const STATUSES = ['all', 'active', 'paused', 'archived'] as const

export function DatasetFilters() {
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
    <aside className="grid gap-4 p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="filter-search">Search</Label>
        <Input
          id="filter-search"
          defaultValue={sp.get('q') ?? ''}
          placeholder="Try: EU private credit"
          onChange={(e) => update('q', e.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Asset class</Label>
        <Select defaultValue={sp.get('class') ?? 'all'} onValueChange={(v) => update('class', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {ASSET_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <Select defaultValue={sp.get('status') ?? 'all'} onValueChange={(v) => update('status', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </aside>
  )
}
