import { AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CopyableHash } from '@/components/common/copyable-hash'
import { fmtRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AIInsight } from '@/lib/api/types'

const ICON = { info: Info, warning: AlertTriangle, critical: ShieldAlert } as const
const TONE = {
  info: 'border-info/30 bg-info/5',
  warning: 'border-warning/40 bg-warning/5',
  critical: 'border-destructive/40 bg-destructive/5',
} as const

export function InsightCard({ insight }: { insight: AIInsight }) {
  const Icon = ICON[insight.severity]
  return (
    <Card className={cn('border-l-2', TONE[insight.severity])}>
      <CardContent className="grid gap-3 py-4">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm leading-snug">{insight.claim}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-tag">{'// evidence:'}</span>
          {insight.evidenceRunIds.map((rid) => (
            <CopyableHash key={rid} value={rid} short className="text-[0.7rem]" />
          ))}
          <span className="ml-auto">{fmtRelativeTime(insight.generatedAt)}</span>
        </div>
        {insight.suggestedAction && (
          <Button asChild size="sm" variant="outline" className="justify-self-start">
            <a href={insight.suggestedAction.href}>{insight.suggestedAction.label}</a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
