import { formatDistanceToNowStrict, format } from 'date-fns'

export function fmtNumber(
  n: number | null | undefined,
  opts: { decimals?: number; placeholder?: string } = {}
): string {
  if (n == null || Number.isNaN(n)) return opts.placeholder ?? '—'
  return n.toLocaleString('en-US', {
    minimumFractionDigits: opts.decimals ?? 0,
    maximumFractionDigits: opts.decimals ?? 0,
  })
}

export function fmtPct(
  fraction: number | null | undefined,
  opts: { decimals?: number; placeholder?: string } = {}
): string {
  if (fraction == null || Number.isNaN(fraction)) return opts.placeholder ?? '—'
  const pct = fraction * 100
  return `${pct.toFixed(opts.decimals ?? 1)}%`
}

export function fmtCurrency(
  amount: number | null | undefined,
  opts: { currency?: string; decimals?: number; placeholder?: string } = {}
): string {
  if (amount == null || Number.isNaN(amount)) return opts.placeholder ?? '—'
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: opts.currency ?? 'USD',
    minimumFractionDigits: opts.decimals ?? 2,
    maximumFractionDigits: opts.decimals ?? 2,
  })
}

export function fmtDate(
  iso: string | Date | null | undefined,
  opts: { pattern?: string; placeholder?: string } = {}
): string {
  if (!iso) return opts.placeholder ?? '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return opts.placeholder ?? '—'
  return format(d, opts.pattern ?? 'yyyy-MM-dd HH:mm')
}

export function fmtRelativeTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? new Date(iso) : iso
  if (Number.isNaN(d.getTime())) return '—'
  return formatDistanceToNowStrict(d, { addSuffix: true })
}

/**
 * Truncates a hash string showing the first (length + 2) characters and the
 * last 4 characters separated by an ellipsis.
 *
 * Note: the plan spec used `slice(-length / 2 | 0 || 4)` which evaluates to
 * `slice(-3)` for the default length=6, producing 3 tail chars. The test
 * expects 4 tail chars ("ef01"), so we use `slice(-4)` unconditionally.
 */
export function fmtHash(hash: string | null | undefined, length = 6): string {
  if (!hash) return '—'
  if (hash.length <= length + 6) return hash
  return `${hash.slice(0, length + 2)}…${hash.slice(-4)}`
}

export function fmtDuration(ms: number): string {
  if (ms < 1_000) return `${ms} ms`
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)} s`
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)} min`
  return `${(ms / 3_600_000).toFixed(1)} h`
}
