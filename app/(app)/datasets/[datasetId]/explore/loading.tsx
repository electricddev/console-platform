import { Skeleton } from '@/components/ui/skeleton'

export default function ExploreLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-[16rem_minmax(0,1fr)_20rem]">
      <Skeleton className="h-[60vh]" />
      <Skeleton className="h-[60vh]" />
      <Skeleton className="h-[60vh] hidden md:block" />
    </div>
  )
}
