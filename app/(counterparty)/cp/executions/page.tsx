import { Suspense } from 'react'
import { executions, analyses } from '@/components/v2/features/cp/cp-fixtures'
import { ExecutionsTable } from '@/components/v2/features/cp/executions-table'

/**
 * Executions page — signed event log.
 *
 * The ExecutionsTable client island handles:
 * - Reading the ?analysis= query param to show an active filter chip
 * - Rendering the dense row log
 *
 * Filter chips: analysis filter is wired to ?analysis= query param.
 * Chain / status / range chips are visual-only (documented in executions-table.tsx).
 *
 * Page is RSC; Suspense boundary needed because ExecutionsTable calls useSearchParams().
 */
export default function CpExecutionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-mono font-medium uppercase tracking-widest text-v2-muted/60">
          {'// EXECUTIONS'}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">
          Executions
        </h1>
        <p className="mt-1 text-sm text-v2-muted">
          Every signed result written to your destinations.
        </p>
      </div>

      <Suspense fallback={<ExecutionsTableSkeleton />}>
        <ExecutionsTable executions={executions} analyses={analyses} />
      </Suspense>
    </div>
  )
}

function ExecutionsTableSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-v2-border/40 rounded-xl border border-v2-border/60 bg-v2-surface">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-[7px]">
          <div className="h-3 w-12 animate-pulse rounded bg-v2-foreground/[0.05]" />
          <div className="h-3 flex-1 animate-pulse rounded bg-v2-foreground/[0.05]" />
          <div className="h-3 w-16 animate-pulse rounded bg-v2-foreground/[0.05]" />
        </div>
      ))}
    </div>
  )
}
