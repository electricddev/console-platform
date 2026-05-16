'use client'

import { useRouter } from 'next/navigation'
import { Surface } from '@/components/v2/ui/surface'
import { analyses } from '@/components/v2/features/cp/cp-fixtures'

type Props = {
  name: string
}

/**
 * Shown on /cp/analyses?submitted=<name> after a proposal is submitted.
 * Dismiss clears the query param via router.replace.
 */
export function SubmittedBanner({ name }: Props) {
  const router = useRouter()

  // Find the vault provider name if this was an existing analysis (propose new version flow),
  // or fall back to a generic provider label.
  const related = analyses.find((a) => a.name === name)
  const providerName = related?.provider.name ?? 'The provider'

  const dismiss = () => {
    router.replace('/cp/analyses')
  }

  return (
    <Surface padding="none" radius="xl" className="flex items-center gap-4 px-5 py-4">
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-v2-foreground">Proposal submitted</p>
        <p className="mt-0.5 text-[12.5px] text-v2-muted">
          Tracked as{' '}
          <span className="font-mono text-v2-foreground">{name}</span> v1 — proposed.{' '}
          {providerName} has been notified.
        </p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-md border border-v2-border/60 px-3 py-1.5 font-mono text-[11.5px] text-v2-muted transition-colors hover:border-v2-border hover:text-v2-foreground"
      >
        Dismiss
      </button>
    </Surface>
  )
}
