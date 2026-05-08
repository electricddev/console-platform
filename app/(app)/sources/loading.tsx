import { RowsSkeleton } from '@/components/common/loading-skeleton'

export default function Loading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <RowsSkeleton rows={6} />
    </div>
  )
}
