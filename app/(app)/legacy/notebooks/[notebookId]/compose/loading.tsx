import { Skeleton } from '@/components/ui/skeleton'

export default function ComposeLoading() {
  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      <Skeleton className="h-10 w-64" />
      <div className="mt-6 grid gap-4 md:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-[60vh]" />
        <div className="grid gap-3">
          <Skeleton className="h-10" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </div>
  )
}
