export function fmtBytes(b: number): string {
  if (b >= 1e9) return `${(b / 1e9).toFixed(2)} GB`
  if (b >= 1e6) return `${(b / 1e6).toFixed(1)} MB`
  if (b >= 1e3) return `${(b / 1e3).toFixed(0)} KB`
  return `${b} B`
}

export function fmtCount(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`
  return new Intl.NumberFormat('en-US').format(n)
}

export function fmtPct(p: number, digits = 2): string {
  return `${(p * 100).toFixed(digits)}%`
}

export function fmtRelative(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  const diff = now - t
  const abs = Math.abs(diff)
  const sign = diff >= 0 ? 'ago' : 'in'
  const mins = Math.round(abs / 60_000)
  const hrs = Math.round(abs / 3_600_000)
  const days = Math.round(abs / 86_400_000)
  if (abs < 60_000) return diff >= 0 ? 'just now' : 'imminent'
  if (mins < 60) return sign === 'ago' ? `${mins} min ago` : `in ${mins} min`
  if (hrs < 48) return sign === 'ago' ? `${hrs} h ago` : `in ${hrs} h`
  return sign === 'ago' ? `${days} d ago` : `in ${days} d`
}

export function fmtAbsoluteUtc(iso: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(new Date(iso))
}

export function fmtClockUtc(t: number): string {
  const d = new Date(t)
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}:${String(d.getUTCSeconds()).padStart(2, '0')} UTC`
}
