'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // In production, ship to telemetry; for now just console.
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <p className="font-tag text-foreground/60">{'// something failed'}</p>
      <h1 className="font-display text-5xl">Unexpected error</h1>
      <p className="max-w-md text-muted-foreground">
        {error.message || 'An unexpected error occurred. We logged a report.'}
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">digest: {error.digest}</p>
      )}
      <Button onClick={reset}>Try again</Button>
    </main>
  )
}
