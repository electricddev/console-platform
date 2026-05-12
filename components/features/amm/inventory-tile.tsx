export function InventoryTile({ inventoryAsset, inventoryQuote }: { inventoryAsset: number; inventoryQuote: number }) {
  const fmt = (v: number) => `$${(v / 1e6).toFixed(1)}M`
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">Inventory</p>
      <p className="mt-1 text-sm tabular-nums">{fmt(inventoryAsset)} ACRED</p>
      <p className="text-sm tabular-nums">{fmt(inventoryQuote)} USDC</p>
    </div>
  )
}
