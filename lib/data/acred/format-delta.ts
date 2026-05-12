import type { Delta } from '@/lib/api/schemas'

export function formatDelta(delta: Delta): { signedText: string; tone: Delta['tone'] } {
  const sign = delta.delta > 0 ? '+' : ''
  const magnitude =
    delta.deltaKind === 'pct'
      ? `${(delta.delta * 100).toFixed(1)}%`
      : delta.deltaKind === 'pp'
        ? `${(delta.delta * 100).toFixed(2)}pp`
        : `${formatAbs(delta.delta)}`
  return { signedText: `${sign}${magnitude}`, tone: delta.tone }
}

function formatAbs(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `${(n / 1e3).toFixed(0)}k`
  return `${n.toFixed(0)}`
}
