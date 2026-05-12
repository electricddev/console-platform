export function LiveNavTile({ navPerToken, navCI95, freshnessSeconds }: { navPerToken: number; navCI95: number; freshnessSeconds: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface/40 p-4">
      <p className="font-tag text-xs text-foreground/55">Live NAV</p>
      <p className="mt-1 text-2xl font-medium tabular-nums">${navPerToken.toFixed(2)}</p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">± ${navCI95.toFixed(3)} (95%)</p>
      <p className="mt-1 text-xs text-muted-foreground">fresh {freshnessSeconds}s</p>
    </div>
  )
}
