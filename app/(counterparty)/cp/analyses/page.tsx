import { Plus } from 'lucide-react'
import { analyses } from '@/components/v2/features/cp/cp-fixtures'
import { AnalysesFilter } from '@/components/v2/features/cp/analyses-filter'

/**
 * Analyses list page.
 *
 * Filter interactivity is handled by the AnalysesFilter client island.
 * The page itself is RSC — it passes the full analyses array as props.
 */
export default function CpAnalysesPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono font-medium uppercase tracking-widest text-v2-muted/60">
            {'// ANALYSES'}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-v2-foreground">
            Analyses
          </h1>
          <p className="mt-1 text-sm text-v2-muted">
            Custom computations you&apos;ve authored against private vault data.
          </p>
        </div>
        <button
          type="button"
          className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-md border border-v2-border/60 bg-v2-surface px-3 py-1.5 font-mono text-[12px] text-v2-muted transition-all hover:border-v2-border hover:text-v2-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-v2-foreground"
          aria-label="New analysis"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
          New analysis
        </button>
      </div>

      {/* Client filter island */}
      <AnalysesFilter analyses={analyses} />
    </div>
  )
}
