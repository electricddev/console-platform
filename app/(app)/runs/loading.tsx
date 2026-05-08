import { RowsSkeleton } from '@/components/common/loading-skeleton'

export default function RunsLoading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <div className="h-20 rounded-lg border border-border/40 bg-surface/20 mb-6" />
      <RowsSkeleton rows={12} />
    </div>
  )
}
