import { BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { truncateHash } from './cp-fixtures'

type Props = {
  hash: string
  verified?: boolean
  className?: string
}

/**
 * SignatureBadge — mono short-hash display with optional BadgeCheck icon.
 * RSC-safe: no interactivity needed.
 */
export function SignatureBadge({ hash, verified = true, className }: Props) {
  return (
    <span
      title={hash}
      className={cn('inline-flex items-center gap-1', className)}
    >
      {verified && (
        <BadgeCheck
          className="h-3.5 w-3.5 shrink-0 text-v2-success"
          strokeWidth={1.75}
          aria-label="Verified"
        />
      )}
      <code className="font-mono text-[11px] tabular-nums text-v2-muted/80 select-all">
        {truncateHash(hash, 4, 4)}
      </code>
    </span>
  )
}
