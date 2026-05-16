import { cn } from '@/lib/utils'
import { truncateHash } from './cp-fixtures'

type Props = {
  value: string
  headChars?: number
  tailChars?: number
  className?: string
}

/**
 * HashMono — renders a long hex string truncated to 0xabcd…1234.
 * Full value visible on hover via title attribute.
 * RSC-safe: no client state needed.
 */
export function HashMono({ value, headChars = 4, tailChars = 4, className }: Props) {
  return (
    <code
      title={value}
      className={cn(
        'font-mono text-[11px] tabular-nums text-v2-muted/80 select-all',
        className,
      )}
    >
      {truncateHash(value, headChars, tailChars)}
    </code>
  )
}
