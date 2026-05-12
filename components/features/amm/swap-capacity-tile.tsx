import type { AmmFeed } from '@/lib/api/schemas'

export function SwapCapacityTile({ maxSwapSize, capacityGate }: { maxSwapSize: number; capacityGate: AmmFeed['capacityGate'] }) {
  const fmt = (v: number) => `$${(v / 1e3).toFixed(0)}k`
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">Max swap size</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">{fmt(maxSwapSize)}</p>
      <p className="mt-1 text-xs text-muted-foreground">gated by {capacityGate}</p>
    </div>
  )
}
