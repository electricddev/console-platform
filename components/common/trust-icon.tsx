import type { ReactElement, SVGProps } from 'react'
import { cn } from '@/lib/utils'

type TrustKind = 'tee' | 'anchor' | 'signature'

const PATHS: Record<TrustKind, ReactElement> = {
  tee: (
    <path
      d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      fill="none"
    />
  ),
  anchor: (
    <>
      <circle cx="12" cy="6" r="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 8v12M5 16a7 7 0 0 0 14 0M9 12h6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </>
  ),
  signature: (
    <path
      d="M3 17c4-4 6-10 9-10s3 4 5 6 3 2 4 1"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      fill="none"
    />
  ),
}

export function TrustIcon({
  kind,
  className,
  ...props
}: { kind: TrustKind } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn('size-3.5', className)}
      {...props}
    >
      {PATHS[kind]}
    </svg>
  )
}
