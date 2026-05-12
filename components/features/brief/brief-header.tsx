import type { AttestationDiscipline } from '@/lib/api/schemas'

type Props = {
  issuerName: string
  periodEnd: string
  discipline: AttestationDiscipline
}

export function BriefHeader({ issuerName, periodEnd, discipline }: Props) {
  const periodLabel = new Date(periodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' })
  const onTimePct = Math.round((discipline.onTimeLast30d / discipline.expectedLast30d) * 100)
  return (
    <header className="flex flex-col gap-1 border-b border-border pb-4">
      <p className="text-sm text-muted-foreground">
        {issuerName} · Period end {periodLabel} · Last attest 30d on-time {onTimePct}% ({discipline.onTimeLast30d}/{discipline.expectedLast30d})
      </p>
    </header>
  )
}
