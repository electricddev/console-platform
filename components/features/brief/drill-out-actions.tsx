import Link from 'next/link'
import { Button } from '@/components/ui/button'

type Props = {
  exploreNonAccrualHref: string
  memoHref: string
  filingsHref: string
  nonAccrualCount: number
}

export function DrillOutActions({ exploreNonAccrualHref, memoHref, filingsHref, nonAccrualCount }: Props) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      <Button asChild variant="outline">
        <Link href={exploreNonAccrualHref}>Open Explore · {nonAccrualCount} non-accrual holdings</Link>
      </Button>
      <Button asChild>
        <Link href={memoHref}>Draft DD memo</Link>
      </Button>
      <Button asChild variant="ghost">
        <Link href={filingsHref}>View raw filings</Link>
      </Button>
    </div>
  )
}
