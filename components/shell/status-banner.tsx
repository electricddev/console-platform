import { TriangleAlert, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatusReport } from '@/lib/api/types'

export function StatusBanner({ status }: { status: StatusReport }) {
  if (status.overall === 'operational') return null
  const tone = status.overall === 'degraded' ? 'bg-warning/15 text-warning border-warning/30' : 'bg-destructive/15 text-destructive border-destructive/30'
  const Icon = status.overall === 'degraded' ? TriangleAlert : AlertOctagon
  const headline = status.overall === 'degraded' ? 'Partial degradation' : 'Outage'
  const detail = status.components.filter((c) => c.status !== 'operational').map((c) => `${c.name}: ${c.status}${c.message ? ` (${c.message})` : ''}`).join(' · ')

  return (
    <div className={cn('flex items-center gap-2 border-b px-3 py-1.5 text-xs', tone)}>
      <Icon className="size-3.5" />
      <span className="font-medium">{headline}.</span>
      <span className="text-foreground/70">{detail}</span>
      <a href="https://status.hyve.xyz" target="_blank" rel="noreferrer" className="ml-auto underline-offset-2 hover:underline">status.hyve.xyz</a>
    </div>
  )
}
