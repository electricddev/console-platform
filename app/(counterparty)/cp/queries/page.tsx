import { Surface } from '@/components/v2/ui/surface'

export default function CpQueriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-widest text-v2-muted/70">
          {'// queries'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">
          Queries
        </h1>
        <p className="mt-2 max-w-prose text-sm text-v2-muted">
          Author and manage the queries that bridge off-chain data into your on-chain logic.
        </p>
      </div>
      <Surface padding="md">
        <p className="text-sm text-v2-muted">Coming soon.</p>
      </Surface>
    </div>
  )
}
