import { RowsSkeleton } from '@/components/common/loading-skeleton'

export default function Loading() {
  return <div className="px-6 py-6"><RowsSkeleton rows={8} /></div>
}
