import type { Org, IssuerCompliance } from '@/lib/api/schemas'

export function IssuerDetailHeader({ org, compliance }: { org: Org; compliance: IssuerCompliance }) {
  const onTime = compliance.discipline.expectedLast30d > 0
    ? Math.round((compliance.discipline.onTimeLast30d / compliance.discipline.expectedLast30d) * 100)
    : 0
  return (
    <header className="flex flex-col gap-2 border-b border-border pb-4">
      <h2 className="text-xl font-medium">{org.name}</h2>
      <p className="text-sm text-muted-foreground">
        {compliance.assetIds.length} asset{compliance.assetIds.length === 1 ? '' : 's'} originated ·
        {' '}30d on-time {onTime}% ({compliance.discipline.onTimeLast30d}/{compliance.discipline.expectedLast30d})
      </p>
    </header>
  )
}
