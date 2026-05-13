import { cn } from '@/lib/utils'
import { HyveMark } from './hyve-mark'

/**
 * The product name displayed alongside the Hyve honeycomb mark.
 * The mark is the Hyve corporate brandmark; the wordmark is the
 * product name shown next to it in shell surfaces.
 */
const DEFAULT_WORDMARK = 'Verant'

export interface HyveLogoProps {
  /**
   * `mark`      — symbol only (use when space is tight or collapsed nav).
   * `wordmark`  — symbol + the product wordmark set in the display serif.
   * Defaults to `wordmark`.
   */
  variant?: 'mark' | 'wordmark'
  /** Rendered mark width in pixels. The wordmark size scales off this. */
  markSize?: number
  /** Wordmark text. Defaults to the product name. */
  wordmark?: string
  /** Optional accessible name. Defaults to the wordmark text. */
  title?: string
  className?: string
}

/**
 * Hyve composite logo — the honeycomb brandmark next to the product wordmark
 * (Verant) set in Instrument Serif. Both elements use `currentColor` / `text-*`
 * so the whole logo can be themed with a single utility on the parent.
 */
export function HyveLogo({
  variant = 'wordmark',
  markSize = 20,
  wordmark = DEFAULT_WORDMARK,
  title,
  className,
}: HyveLogoProps) {
  // The wordmark optical size is tuned to sit slightly larger than the mark's
  // cap height — the serif's modulation makes equal-sized text feel small.
  const wordmarkPx = Math.round(markSize * 1.05)
  const accessibleName = title ?? (variant === 'wordmark' ? wordmark : 'Hyve')

  return (
    <span
      className={cn('inline-flex items-center gap-2.5 text-v2-foreground', className)}
      aria-label={accessibleName}
      role="img"
    >
      <HyveMark size={markSize} className="shrink-0" />
      {variant === 'wordmark' && (
        <span
          aria-hidden="true"
          className="whitespace-nowrap font-serif leading-none tracking-tight"
          style={{
            fontFamily: 'var(--font-serif, ui-serif, Georgia, serif)',
            fontSize: `${wordmarkPx}px`,
          }}
        >
          {wordmark}
        </span>
      )}
    </span>
  )
}
