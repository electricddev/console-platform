import { ArrowRight, Database, Plug, Server, ShieldCheck, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lineage, LineageNode } from '@/lib/api/endpoints/datasets'

const ICON: Record<LineageNode['kind'], typeof Database> = {
  source: Database,
  agent: Plug,
  storage: Server,
  enclave: ShieldCheck,
  output: Sparkles,
}

const STATUS_TONE: Record<LineageNode['status'], string> = {
  ok: 'border-success/40 bg-success/5',
  lagging: 'border-warning/40 bg-warning/5',
  down: 'border-destructive/40 bg-destructive/5',
}

export function LineageFlow({ lineage }: { lineage: Lineage }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/40 p-6">
      {lineage.nodes.map((n, i) => {
        const Icon = ICON[n.kind]
        return (
          <div key={n.id} className="flex items-center gap-3">
            <div className={cn('flex flex-col items-center gap-2 rounded-lg border p-4 min-w-32', STATUS_TONE[n.status])}>
              <Icon className="size-5" />
              <p className="font-tag text-[0.65rem] text-muted-foreground">{n.kind}</p>
              <p className="text-sm font-medium text-center">{n.label}</p>
            </div>
            {i < lineage.nodes.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
          </div>
        )
      })}
    </div>
  )
}
