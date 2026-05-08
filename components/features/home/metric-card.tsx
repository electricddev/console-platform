import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { AttestationBadge } from '@/components/common/attestation-badge'
import { FreshnessIndicator } from '@/components/common/freshness-indicator'
import type { Attestation } from '@/lib/api/types'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: ReactNode
  delta?: { direction: 'up' | 'down' | 'flat'; label: string }
  freshAt?: string | null
  attestation?: Attestation | null
  className?: string
}

const deltaTone = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground',
} as const

const deltaArrow = { up: '↑', down: '↓', flat: '→' } as const

export function MetricCard({ label, value, delta, freshAt, attestation, className }: Props) {
  return (
    <Card className={cn('relative', className)}>
      <CardContent className="grid gap-1.5 py-4">
        <div className="flex items-center justify-between">
          <p className="font-tag text-foreground/55">{label}</p>
          {attestation !== undefined && <AttestationBadge attestation={attestation} compact />}
        </div>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        <div className="flex items-center justify-between text-xs">
          {delta ? (
            <span className={deltaTone[delta.direction]}>
              {deltaArrow[delta.direction]} {delta.label}
            </span>
          ) : (
            <span />
          )}
          {freshAt !== undefined && <FreshnessIndicator timestamp={freshAt} />}
        </div>
      </CardContent>
    </Card>
  )
}
